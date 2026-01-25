import type { PeerId } from "@clipboard-sync/schemas";

import type { EncryptedMessage } from "./crypto";
import type { SignalingService } from "./signaling";
import type { Transport, TransportEvents } from "./transport";

export interface P2PEvents extends TransportEvents {
  onPeerConnected: (peerId: PeerId) => void;
  onPeerDisconnected: (peerId: PeerId) => void;
}

/**
 * Manages WebRTC connections for multiple peers.
 * Uses SignalingService for the handshake.
 */
export class P2PTransport implements Transport {
  private signaling: SignalingService;
  private listener: P2PEvents | null = null;
  private peers: Map<PeerId, PeerConnectionWrapper> = new Map();

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
  };

  constructor(signaling: SignalingService) {
    this.signaling = signaling;
  }

  public setListener(listener: P2PEvents): void {
    this.listener = listener;
  }

  public async connect(targetId?: PeerId): Promise<void> {
    if (!targetId) {
      throw new Error("P2P connect requires a target peer ID");
    }
    this.getOrCreatePeer(targetId, true);
  }

  public disconnect(): void {
    this.peers.forEach((peer) => peer.destroy());
    this.peers.clear();
  }

  public async send(
    payload: EncryptedMessage,
    targetId?: PeerId,
  ): Promise<void> {
    if (targetId) {
      const peer = this.peers.get(targetId);
      if (peer && peer.isConnected()) {
        peer.send(payload);
      }
    } else {
      this.peers.forEach((peer) => {
        if (peer.isConnected()) {
          peer.send(payload);
        }
      });
    }
  }

  // --- Signaling Hooks ---

  // Called by Manager when a signal arrives
  public async handleSignal(
    peerId: PeerId,
    type: "offer" | "answer" | "ice",
    data: unknown,
  ) {
    const peer = this.getOrCreatePeer(peerId, false);

    try {
      if (type === "offer") {
        await peer.handleOffer(data as RTCSessionDescriptionInit);
      } else if (type === "answer") {
        await peer.handleAnswer(data as RTCSessionDescriptionInit);
      } else if (type === "ice") {
        await peer.handleCandidate(data as RTCIceCandidateInit);
      }
    } catch (error) {
      console.error(`[P2P] Error handling signal from ${peerId}`, error);
    }
  }

  // --- Internal ---

  private getOrCreatePeer(
    peerId: PeerId,
    initiator: boolean,
  ): PeerConnectionWrapper {
    let peer = this.peers.get(peerId);
    if (!peer) {
      peer = new PeerConnectionWrapper(
        peerId,
        this.rtcConfig,
        this.signaling,
        {
          onMessage: (msg) => this.listener?.onMessage(msg, peerId),
          onStatusChange: (status) => {
            if (status === "connected") {
              this.listener?.onPeerConnected(peerId);
            } else if (status === "disconnected" || status === "failed") {
              this.listener?.onPeerDisconnected(peerId);
              if (status === "failed") {
                this.peers.delete(peerId);
                peer?.destroy();
              }
            }
          },
        },
        initiator,
      );
      this.peers.set(peerId, peer);
    }
    return peer;
  }
}

/**
 * Encapsulates a single peer connection state and logic.
 */
class PeerConnectionWrapper {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private peerId: PeerId;
  private signaling: SignalingService;
  private callbacks: {
    onMessage: (msg: EncryptedMessage) => void;
    onStatusChange: (status: RTCPeerConnectionState) => void;
  };
  private isPolite: boolean;
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;

  constructor(
    peerId: PeerId,
    config: RTCConfiguration,
    signaling: SignalingService,
    callbacks: {
      onMessage: (msg: EncryptedMessage) => void;
      onStatusChange: (status: RTCPeerConnectionState) => void;
    },
    initiator: boolean,
  ) {
    this.peerId = peerId;
    this.signaling = signaling;
    this.callbacks = callbacks;
    this.pc = new RTCPeerConnection(config);
    this.isPolite = !initiator;

    this.setupPC();

    if (initiator) {
      this.dc = this.pc.createDataChannel("clipboard-sync", {
        ordered: true,
      });
      this.setupDataChannel(this.dc);
      this.makingOffer = true;
      this.pc.onnegotiationneeded = this.onNegotiationNeeded.bind(this);
    } else {
      this.pc.ondatachannel = (ev) => {
        this.dc = ev.channel;
        this.setupDataChannel(this.dc);
      };
    }
  }

  public destroy() {
    this.pc.close();
    if (this.dc) this.dc.close();
  }

  public isConnected(): boolean {
    return (
      this.pc.connectionState === "connected" && this.dc?.readyState === "open"
    );
  }

  public send(payload: EncryptedMessage) {
    if (this.dc && this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(payload));
    }
  }

  public async handleOffer(sdp: RTCSessionDescriptionInit) {
    const offerCollision =
      this.makingOffer ||
      this.pc.signalingState !== "stable" ||
      this.isSettingRemoteAnswerPending;

    this.ignoreOffer = !this.isPolite && offerCollision;

    if (this.ignoreOffer) {
      return;
    }

    if (offerCollision) {
      await Promise.all([
        this.pc.setLocalDescription({ type: "rollback" }),
        this.pc.setRemoteDescription(sdp),
      ]);
    } else {
      await this.pc.setRemoteDescription(sdp);
    }

    await this.pc.setLocalDescription(await this.pc.createAnswer());
    this.signaling.sendSignal(this.peerId, "answer", this.pc.localDescription!);
  }

  public async handleAnswer(sdp: RTCSessionDescriptionInit) {
    this.isSettingRemoteAnswerPending = true;
    try {
      await this.pc.setRemoteDescription(sdp);
    } catch (e) {
      console.error("Failed to set remote answer", e);
    } finally {
      this.isSettingRemoteAnswerPending = false;
    }
  }

  public async handleCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (e) {
      if (!this.ignoreOffer) {
        console.error("Error adding ICE candidate", e);
      }
    }
  }

  private setupPC() {
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signaling.sendSignal(this.peerId, "ice", candidate);
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.callbacks.onStatusChange(this.pc.connectionState);
    };

    this.pc.onnegotiationneeded = () => {
      this.onNegotiationNeeded();
    };
  }

  private async onNegotiationNeeded() {
    try {
      this.makingOffer = true;
      await this.pc.setLocalDescription(await this.pc.createOffer());
      this.signaling.sendSignal(
        this.peerId,
        "offer",
        this.pc.localDescription!,
      );
    } catch (err) {
      console.error(`[P2P] Negotiation error with ${this.peerId}`, err);
    } finally {
      this.makingOffer = false;
    }
  }

  private setupDataChannel(dc: RTCDataChannel) {
    dc.onopen = () => {
      // Ready
    };
    dc.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        this.callbacks.onMessage(payload);
      } catch (e) {
        console.error("P2P Message parse error", e);
      }
    };
  }
}
