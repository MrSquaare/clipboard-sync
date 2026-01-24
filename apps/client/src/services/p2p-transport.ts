import type { PeerId } from "@clipboard-sync/schemas";

import { useClientStore } from "../store/useClientStore";
import { useLogStore } from "../store/useLogStore";

import type { EncryptedMessage } from "./crypto";
import type { Transport } from "./transport";

export interface P2PSignaler {
  sendOffer: (targetId: PeerId, sdp: RTCSessionDescriptionInit) => void;
  sendAnswer: (targetId: PeerId, sdp: RTCSessionDescriptionInit) => void;
  sendCandidate: (targetId: PeerId, candidate: RTCIceCandidate) => void;
}

export class P2PTransport implements Transport {
  private peerConnections: Map<PeerId, RTCPeerConnection> = new Map();
  private dataChannels: Map<PeerId, RTCDataChannel> = new Map();
  private retryCounts: Map<PeerId, number> = new Map();
  private pendingTimeouts: Map<PeerId, ReturnType<typeof setTimeout>> =
    new Map();

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
  };

  private signaler: P2PSignaler;
  private onMessage: (msg: EncryptedMessage, senderId: PeerId) => void;

  constructor(
    signaler: P2PSignaler,
    onMessage: (msg: EncryptedMessage, senderId: PeerId) => void,
  ) {
    this.signaler = signaler;
    this.onMessage = onMessage;
  }

  async connect(targetId?: PeerId): Promise<void> {
    if (!targetId) {
      throw new Error("P2P connection requires a target peer ID");
    }
    this.initiateConnection(targetId);
  }

  disconnect(): void {
    this.pendingTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.pendingTimeouts.clear();

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.retryCounts.clear();
  }

  isConnected(): boolean {
    return this.dataChannels.size > 0;
  }

  async send(payload: EncryptedMessage, targetId?: PeerId): Promise<void> {
    const msgStr = JSON.stringify(payload);

    if (targetId) {
      const dc = this.dataChannels.get(targetId);
      if (dc?.readyState === "open") {
        dc.send(msgStr);
      }
    } else {
      // Broadcast to all open channels
      this.dataChannels.forEach((dc) => {
        if (dc.readyState === "open") {
          dc.send(msgStr);
        }
      });
    }
  }

  // --- Signaling Handlers ---

  async handleOffer(peerId: PeerId, sdp: RTCSessionDescriptionInit) {
    // If we already have a stable connection, ignore?
    // Or maybe this is a renegotiation. For now, treat as new.
    this.closePeer(peerId);
    const pc = this.createPeerConnection(peerId);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.signaler.sendAnswer(peerId, answer);
    } catch (e) {
      console.error("Error handling offer", e);
      useLogStore
        .getState()
        .addLog(`[P2P] Error handling offer from ${peerId}`, "error");
    }
  }

  async handleAnswer(peerId: PeerId, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      if (pc.signalingState === "stable") {
        console.warn(
          `[P2P] Ignoring answer for ${peerId.slice(0, 8)} - already stable`,
        );
        return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (e) {
        console.error("Error handling answer", e);
        useLogStore
          .getState()
          .addLog(`[P2P] Error handling answer from ${peerId}`, "error");
      }
    }
  }

  async handleCandidate(peerId: PeerId, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    }
  }

  // --- Internal Logic ---

  private initiateConnection(peerId: PeerId) {
    const { updateClient } = useClientStore.getState();
    const { addLog } = useLogStore.getState();

    updateClient(peerId, { status: "connecting" });
    this.closePeer(peerId);

    const pc = this.createPeerConnection(peerId);
    const dc = pc.createDataChannel("clipboard");
    this.setupDataChannel(dc, peerId);

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          this.signaler.sendOffer(peerId, pc.localDescription);
        }
      })
      .catch((e) => {
        console.error("Failed to create offer", e);
        addLog(`[P2P] Failed to create offer for ${peerId}`, "error");
        this.handleFailure(peerId);
      });
  }

  private createPeerConnection(peerId: PeerId): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerId, pc);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.signaler.sendCandidate(peerId, e.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      const { updateClient } = useClientStore.getState();
      const { addLog } = useLogStore.getState();

      console.log(`[P2P] State change for ${peerId}: ${state}`);

      if (state === "connected") {
        updateClient(peerId, { status: "connected", type: "p2p" });
        addLog(`P2P Connected with ${peerId.slice(0, 8)}`, "success");
        this.retryCounts.set(peerId, 0);
      } else if (state === "failed" || state === "disconnected") {
        updateClient(peerId, { status: "connected", type: "relay" });
        this.handleFailure(peerId);
      }
    };

    pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel, peerId);
    };

    return pc;
  }

  private setupDataChannel(dc: RTCDataChannel, peerId: PeerId) {
    this.dataChannels.set(peerId, dc);
    dc.onopen = () => {
      useClientStore
        .getState()
        .updateClient(peerId, { status: "connected", type: "p2p" });
    };
    dc.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        this.onMessage(payload, peerId);
      } catch (err) {
        console.error("P2P Message Error", err);
      }
    };
    dc.onclose = () => {
      this.dataChannels.delete(peerId);
    };
  }

  private closePeer(peerId: PeerId) {
    this.peerConnections.get(peerId)?.close();
    this.peerConnections.delete(peerId);
    this.dataChannels.delete(peerId);
  }

  private handleFailure(peerId: PeerId) {
    const currentRetries = this.retryCounts.get(peerId) || 0;
    const { addLog } = useLogStore.getState();

    if (currentRetries < 3) {
      const delay = 2000 * (currentRetries + 1);
      addLog(
        `P2P failed with ${peerId.slice(0, 8)}. Retrying in ${delay / 1000}s...`,
        "info",
      );
      this.retryCounts.set(peerId, currentRetries + 1);

      const timeout = setTimeout(() => this.initiateConnection(peerId), delay);
      this.pendingTimeouts.set(peerId, timeout);
    } else {
      addLog(
        `P2P failed with ${peerId.slice(0, 8)} after retries. Using Relay.`,
        "info",
      );
    }
  }
}
