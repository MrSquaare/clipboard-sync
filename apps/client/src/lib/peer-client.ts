import { EventEmitter } from "./event-emitter";

export type PeerSignal =
  | RTCSessionDescriptionInit
  | { type: "candidate"; candidate: RTCIceCandidateInit | null };
export type PeerMessage = string;

type PeerClientStateEventMap = {
  disconnected: [reason: string];
  connecting: [];
  connected: [];
  reconnecting: [delay: number, attempt: number];
  closed: [];
};

export type PeerClientState = keyof PeerClientStateEventMap;

export type PeerClientEventMap = PeerClientStateEventMap & {
  signal: [PeerSignal];
  message: [PeerMessage];
  error: [unknown];
};

export type PeerClientOptions = {
  initiator: boolean;
  rtcConfig?: RTCConfiguration;
  channelLabel?: string;
  ordered?: boolean;
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  disconnectGraceMs?: number;
};

type RequiredOptions = Required<
  Omit<PeerClientOptions, "rtcConfig" | "ordered">
> & {
  rtcConfig?: RTCConfiguration;
  ordered?: boolean;
};

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 30000;
const DEFAULT_CHANNEL_LABEL = "peer";
const DEFAULT_DISCONNECT_GRACE_MS = 3000;

export class PeerClient {
  private readonly options: RequiredOptions;
  private readonly events = new EventEmitter<PeerClientEventMap>();

  private pc?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private state: PeerClientState = "disconnected";
  private makingOffer = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private retryCount = 0;
  private retryTimer: number | null = null;
  private disconnectGraceTimer: number | null = null;

  on = this.events.on.bind(this.events);

  constructor(options: PeerClientOptions) {
    this.options = {
      initiator: options.initiator,
      rtcConfig: options.rtcConfig,
      channelLabel: options.channelLabel ?? DEFAULT_CHANNEL_LABEL,
      ordered: options.ordered,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      baseBackoffMs: options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS,
      maxBackoffMs: options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
      disconnectGraceMs:
        options.disconnectGraceMs ?? DEFAULT_DISCONNECT_GRACE_MS,
    };
  }

  get status(): PeerClientState {
    return this.state;
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

  close(): void {
    if (this.state === "closed") {
      return;
    }

    this.resetRetryState();
    this.setState("closed");
    this.events.clearAll();
    this.teardownPeerConnection();
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

    const pc = this.pc;

    try {
      if (signal.type === "candidate") {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate);
        } else if (signal.candidate) {
          this.pendingCandidates.push(signal.candidate);
        }
        return;
      }

      if (
        signal.type === "offer" &&
        (pc.signalingState !== "stable" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed")
      ) {
        this.createPeerConnection();
      }

      await pc.setRemoteDescription(signal);
      await this.flushPendingCandidates();

      if (signal.type === "offer") {
        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

        if (pc.localDescription) {
          this.events.emit("signal", pc.localDescription);
        }
      }
    } catch (error) {
      this.events.emit("error", error);
    }
  }

  private createPeerConnection(): void {
    this.teardownPeerConnection();

    this.pc = new RTCPeerConnection(this.options.rtcConfig);
    this.pendingCandidates = [];

    this.pc.onconnectionstatechange = () => {
      this.handleStateChange();
    };

    this.pc.oniceconnectionstatechange = () => {
      this.handleStateChange();
    };

    this.pc.ondatachannel = (event) => {
      this.teardownDataChannel();

      this.channel = event.channel;
      this.attachChannelHandlers(this.channel);
    };

    this.pc.onicecandidate = (event) => {
      const candidate = event.candidate ? event.candidate.toJSON() : null;

      this.events.emit("signal", { type: "candidate", candidate });
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

  private scheduleReconnect(): boolean {
    if (this.retryTimer || this.state === "closed") {
      return false;
    }

    if (this.retryCount >= this.options.maxRetries) {
      return false;
    }

    const delay = Math.min(
      this.options.baseBackoffMs * 2 ** this.retryCount,
      this.options.maxBackoffMs,
    );
    const attempt = this.retryCount + 1;

    this.setState("reconnecting", delay, attempt);

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.retryCount += 1;
      this.reconnect();
    }, delay);

    return true;
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

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private clearDisconnectGraceTimer(): void {
    if (this.disconnectGraceTimer) {
      clearTimeout(this.disconnectGraceTimer);
      this.disconnectGraceTimer = null;
    }
  }

  private resetRetryState(): void {
    this.retryCount = 0;
    this.clearRetryTimer();
    this.clearDisconnectGraceTimer();
  }

  private setState<T extends PeerClientState>(
    state: T,
    ...args: PeerClientEventMap[T]
  ): void {
    if (this.state === state) {
      return;
    }

    this.state = state;
    this.events.emit(state, ...args);
  }
}
