import { EventEmitter } from "./event-emitter";

export type PeerClientEventMap = PeerClientStateEventMap & {
  error: [unknown];
  message: [PeerMessage];
  signal: [PeerSignal];
};
export type PeerClientOptions = {
  baseBackoffMs?: number;
  channelLabel?: string;
  disconnectGraceMs?: number;
  initiator: boolean;
  maxBackoffMs?: number;
  maxFirstRetries?: number;
  maxRetries?: number;
  ordered?: boolean;
  rtcConfig?: RTCConfiguration;
};

export type PeerClientState = keyof PeerClientStateEventMap;

export type PeerMessage = string;

export type PeerSignal =
  | RTCSessionDescriptionInit
  | { candidate: null | RTCIceCandidateInit; type: "candidate" };

type PeerClientStateEventMap = {
  closed: [];
  connected: [];
  connecting: [delay?: number, attempt?: number];
  disconnected: [reason: string];
  reconnecting: [delay: number, attempt: number];
};

type RequiredOptions = Required<
  Omit<PeerClientOptions, "ordered" | "rtcConfig">
> & {
  ordered?: boolean;
  rtcConfig?: RTCConfiguration;
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_FIRST_RETRIES = 1;
const DEFAULT_BASE_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 30000;
const DEFAULT_CHANNEL_LABEL = "peer";
const DEFAULT_DISCONNECT_GRACE_MS = 3000;

export class PeerClient {
  private readonly events = new EventEmitter<PeerClientEventMap>();
  on = this.events.on.bind(this.events);

  get status(): PeerClientState {
    return this.state;
  }
  private channel?: RTCDataChannel;
  private disconnectGraceTimer: null | number = null;
  private makingOffer = false;
  private readonly options: RequiredOptions;
  private pc?: RTCPeerConnection;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private retryCount = 0;

  private retryTimer: null | number = null;

  private state: PeerClientState = "disconnected";

  constructor(options: PeerClientOptions) {
    this.options = {
      baseBackoffMs: options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS,
      channelLabel: options.channelLabel ?? DEFAULT_CHANNEL_LABEL,
      disconnectGraceMs:
        options.disconnectGraceMs ?? DEFAULT_DISCONNECT_GRACE_MS,
      initiator: options.initiator,
      maxBackoffMs: options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
      maxFirstRetries: options.maxFirstRetries ?? DEFAULT_MAX_FIRST_RETRIES,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      ordered: options.ordered,
      rtcConfig: options.rtcConfig,
    };
  }

  close(): void {
    if (this.state === "closed") {
      return;
    }

    this.resetRetryState();
    this.setState("closed");
    this.events.clearAll();
    this.teardownPeerConnection();
  }

  connect(): void {
    if (this.state !== "disconnected") {
      return;
    }

    this.resetRetryState();
    this.setState("connecting");
    this.createPeerConnection();

    if (this.options.initiator) {
      if (!this.channel) {
        this.createDataChannel();
      }

      this.negotiate(false);
    }
  }

  send(data: PeerMessage): void {
    if (!this.channel || this.channel.readyState !== "open") {
      throw new Error("Peer data channel is not open.");
    }

    this.channel.send(data);
  }

  async signal(signal: PeerSignal): Promise<void> {
    if (!this.pc || this.state === "closed") {
      return;
    }

    try {
      if (signal.type === "candidate") {
        if (this.pc.remoteDescription) {
          await this.pc.addIceCandidate(signal.candidate);
        } else if (signal.candidate) {
          this.pendingCandidates.push(signal.candidate);
        }

        return;
      }

      if (
        signal.type === "offer" &&
        (this.pc.signalingState !== "stable" ||
          this.pc.connectionState === "failed" ||
          this.pc.connectionState === "closed")
      ) {
        this.createPeerConnection();
      }

      await this.pc.setRemoteDescription(signal);
      await this.flushPendingCandidates();

      if (signal.type === "offer") {
        const answer = await this.pc.createAnswer();

        await this.pc.setLocalDescription(answer);

        if (this.pc.localDescription) {
          this.events.emit("signal", this.pc.localDescription);
        }
      }
    } catch (error) {
      this.events.emit("error", error);
    }
  }

  private attachChannelHandlers(channel: RTCDataChannel): void {
    channel.onopen = () => {
      this.markConnected();
    };

    channel.onclose = () => {
      this.markDisconnected("data-channel-closed");
    };

    channel.onmessage = (event) => {
      this.events.emit("message", event.data);
    };

    channel.onerror = (event) => {
      this.events.emit("error", event.error);
    };
  }

  private clearDisconnectGraceTimer(): void {
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);

      this.disconnectGraceTimer = null;
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);

      this.retryTimer = null;
    }
  }

  private createDataChannel(): void {
    this.teardownDataChannel();

    if (!this.pc) {
      return;
    }

    const channel = this.pc.createDataChannel(this.options.channelLabel, {
      ordered: this.options.ordered,
    });

    this.channel = channel;

    this.attachChannelHandlers(channel);
  }

  private createPeerConnection(): void {
    this.teardownPeerConnection();

    const pc = new RTCPeerConnection(this.options.rtcConfig);

    this.pc = pc;
    this.pendingCandidates = [];

    pc.onconnectionstatechange = () => {
      this.handleStateChange();
    };

    pc.oniceconnectionstatechange = () => {
      this.handleStateChange();
    };

    pc.ondatachannel = (event) => {
      this.teardownDataChannel();

      this.channel = event.channel;

      this.attachChannelHandlers(this.channel);
    };

    pc.onicecandidate = (event) => {
      const candidate = event.candidate ? event.candidate.toJSON() : null;

      this.events.emit("signal", { candidate, type: "candidate" });
    };
  }

  private async flushPendingCandidates(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) {
      return;
    }

    const candidates = this.pendingCandidates.splice(0);

    for (const candidate of candidates) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (error) {
        this.events.emit("error", error);
      }
    }
  }

  private handleStateChange(): void {
    if (!this.pc) {
      return;
    }

    const connectionState = this.pc.connectionState;
    const iceState = this.pc.iceConnectionState;

    if (connectionState === "connected" || iceState === "connected") {
      this.markConnected();

      return;
    }

    if (connectionState === "disconnected" || iceState === "disconnected") {
      this.markDisconnected("connection-disconnected");

      return;
    }

    if (connectionState === "failed" || iceState === "failed") {
      this.markDisconnected("connection-failed");

      return;
    }

    if (connectionState === "closed") {
      this.markDisconnected("connection-closed");

      return;
    }
  }

  private markConnected(): void {
    this.resetRetryState();
    this.setState("connected");
  }

  private markDisconnected(reason: string): void {
    if (this.state === "closed") {
      return;
    }

    if (this.disconnectGraceTimer || this.retryTimer) {
      return;
    }

    this.disconnectGraceTimer = setTimeout(() => {
      this.disconnectGraceTimer = null;

      if (this.state === "closed") {
        return;
      }

      if (!this.scheduleReconnect()) {
        this.setState("disconnected", reason);
      }
    }, this.options.disconnectGraceMs);
  }

  private async negotiate(iceRestart: boolean): Promise<void> {
    if (!this.pc || this.makingOffer) {
      return;
    }

    this.makingOffer = true;

    try {
      const offer = await this.pc.createOffer({ iceRestart });

      await this.pc.setLocalDescription(offer);

      if (this.pc.localDescription) {
        this.events.emit("signal", this.pc.localDescription);
      }
    } catch (error) {
      this.events.emit("error", error);
    } finally {
      this.makingOffer = false;
    }
  }

  private reconnect(): void {
    if (this.state === "closed") {
      return;
    }

    this.createPeerConnection();

    if (this.options.initiator) {
      if (!this.channel) {
        this.createDataChannel();
      }

      this.negotiate(true);
    }
  }

  private resetRetryState(): void {
    this.retryCount = 0;

    this.clearRetryTimer();
    this.clearDisconnectGraceTimer();
  }

  private scheduleReconnect(): boolean {
    if (this.retryTimer || this.state === "closed") {
      return false;
    }

    const maxRetries =
      this.state === "connecting"
        ? this.options.maxFirstRetries
        : this.options.maxRetries;

    if (this.retryCount >= maxRetries) {
      return false;
    }

    const delay = Math.min(
      this.options.baseBackoffMs * 2 ** this.retryCount,
      this.options.maxBackoffMs,
    );
    const attempt = this.retryCount + 1;

    if (this.state === "connecting") {
      this.setState("connecting", delay, attempt);
    } else {
      this.setState("reconnecting", delay, attempt);
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.retryCount += 1;

      this.reconnect();
    }, delay);

    return true;
  }

  private setState<T extends PeerClientState>(
    state: T,
    ...args: PeerClientEventMap[T]
  ): void {
    if (
      this.state === state &&
      state !== "connecting" &&
      state !== "reconnecting"
    ) {
      return;
    }

    this.state = state;

    this.events.emit(state, ...args);
  }

  private teardownDataChannel(): void {
    if (!this.channel) {
      return;
    }

    const channel = this.channel;

    this.channel = undefined;

    channel.onopen = null;
    channel.onclose = null;
    channel.onmessage = null;
    channel.onerror = null;

    channel.close();
  }

  private teardownPeerConnection(): void {
    this.teardownDataChannel();

    if (!this.pc) {
      return;
    }

    const pc = this.pc;

    this.pc = undefined;

    pc.onicecandidate = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;
    pc.ondatachannel = null;

    pc.close();
  }
}
