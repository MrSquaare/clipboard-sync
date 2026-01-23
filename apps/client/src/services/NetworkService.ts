import { RelayTransport } from "./RelayTransport";
import { CryptoService, EncryptedMessage } from "./CryptoService";
import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { ServerMessage, PeerId } from "../types/protocol";

interface ClipboardPayload {
  id: string;
  timestamp: number;
  content: string;
}

export class NetworkService {
  private relay: RelayTransport | null = null;
  private peerConnections: Map<PeerId, RTCPeerConnection> = new Map();
  private dataChannels: Map<PeerId, RTCDataChannel> = new Map();
  private processedMessageIds: Set<string> = new Set();
  private p2pRetryCounts: Map<PeerId, number> = new Map();
  private pendingP2PTimeouts: Map<PeerId, ReturnType<typeof setTimeout>> =
    new Map();

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
  };

  async joinRoom(secret: string) {
    const { serverUrl, roomId } = useSettingsStore.getState();

    await CryptoService.setSecret(secret);

    this.relay = new RelayTransport(
      serverUrl,
      roomId,
      this.handleServerMessage.bind(this),
    );

    await this.relay.connect();
  }

  disconnect() {
    this.pendingP2PTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.pendingP2PTimeouts.clear();

    if (this.relay) {
      this.relay.sendLeave();
      this.relay.disconnect();
    }

    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.p2pRetryCounts.clear();

    useAppStore.getState().clearClients();
    useAppStore.getState().setConnectionStatus("disconnected");
  }

  async broadcastClipboard(text: string) {
    const payload: ClipboardPayload = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      content: text,
    };

    this.processedMessageIds.add(payload.id);

    try {
      const encrypted = await CryptoService.encrypt(JSON.stringify(payload));
      const transportMode = useSettingsStore.getState().transportMode;
      const clients = useAppStore.getState().clients;

      console.log(
        `[Network] Broadcast. Mode: ${transportMode}, Clients: ${clients.length}`,
      );

      let sentP2PCount = 0;

      if (transportMode !== "relay") {
        const msgStr = JSON.stringify(encrypted);
        this.dataChannels.forEach((dc) => {
          if (dc.readyState === "open") {
            dc.send(msgStr);
            sentP2PCount++;
          }
        });
      }

      const totalClients = clients.length;
      const shouldRelay =
        transportMode === "relay" ||
        (transportMode === "auto" && sentP2PCount < totalClients);

      if (shouldRelay && this.relay) {
        this.relay.sendData(encrypted);
        console.log(
          `[Network] Sent via Relay (P2P coverage: ${sentP2PCount}/${totalClients})`,
        );
      }
    } catch (e) {
      console.error("Broadcast failed", e);
      useAppStore.getState().addLog(`Broadcast failed: ${e}`, "error");
    }
  }

  private async handleServerMessage(msg: ServerMessage) {
    const store = useAppStore.getState();

    switch (msg.type) {
      case "WELCOME":
        store.addLog(
          `[Network] Joined room as ${msg.payload.myId.slice(0, 8)}`,
          "success",
        );
        store.setMyId(msg.payload.myId);
        store.clearClients();

        if (msg.payload.peers.length > 0) {
          store.addLog(
            `[Network] Discovered ${msg.payload.peers.length} existing clients`,
            "info",
          );
          msg.payload.peers.forEach((pid) => this.handleFoundClient(pid));
        }
        break;

      case "PEER_JOINED":
        store.addLog(
          `[Network] Client joined: ${msg.payload.peerId.slice(0, 8)}`,
          "info",
        );
        this.handleFoundClient(msg.payload.peerId);
        break;

      case "PEER_LEFT":
        store.addLog(
          `[Network] Client left: ${msg.payload.peerId.slice(0, 8)}`,
          "info",
        );
        store.removeClient(msg.payload.peerId);
        this.closePeer(msg.payload.peerId);
        break;

      case "SIGNAL_OFFER":
        if (useSettingsStore.getState().transportMode !== "relay") {
          await this.handleOffer(
            msg.senderId,
            msg.sdp as RTCSessionDescriptionInit,
          );
        }
        break;

      case "SIGNAL_ANSWER":
        await this.handleAnswer(
          msg.senderId,
          msg.sdp as RTCSessionDescriptionInit,
        );
        break;

      case "SIGNAL_ICE":
        await this.handleCandidate(
          msg.senderId,
          msg.candidate as RTCIceCandidateInit,
        );
        break;

      case "RELAY_DATA":
        await this.handleIncomingData(
          msg.payload as EncryptedMessage,
          msg.senderId,
          "relay",
        );
        break;
    }
  }

  private handleFoundClient(peerId: PeerId) {
    const store = useAppStore.getState();
    const mode = useSettingsStore.getState().transportMode;

    store.addClient(peerId);
    store.updateClient(peerId, { status: "connected", type: "relay" });

    if (mode !== "relay") {
      const existingTimeout = this.pendingP2PTimeouts.get(peerId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const delay = Math.random() * 1000;
      const timeoutId = setTimeout(() => {
        this.pendingP2PTimeouts.delete(peerId);
        this.initiateP2P(peerId);
      }, delay);

      this.pendingP2PTimeouts.set(peerId, timeoutId);
    }
  }

  private initiateP2P(peerId: PeerId) {
    const store = useAppStore.getState();

    store.updateClient(peerId, { status: "connecting" });
    this.closePeer(peerId);

    const pc = this.createPeerConnection(peerId);
    const dc = pc.createDataChannel("clipboard");
    this.setupDataChannel(dc, peerId);

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          this.relay?.sendInternal({
            type: "SIGNAL_OFFER",
            targetId: peerId,
            sdp: pc.localDescription,
          });
        }
      })
      .catch((e) => {
        console.error("Failed to create offer", e);
        this.handleP2PFailure(peerId);
      });
  }

  private createPeerConnection(peerId: PeerId): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerId, pc);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.relay?.sendInternal({
          type: "SIGNAL_ICE",
          targetId: peerId,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      const store = useAppStore.getState();

      console.log(`[P2P] State change for ${peerId}: ${state}`);

      if (state === "connected") {
        store.updateClient(peerId, { status: "connected", type: "p2p" });
        store.addLog(`P2P Connected with ${peerId.slice(0, 8)}`, "success");
        this.p2pRetryCounts.set(peerId, 0);
      } else if (state === "failed" || state === "disconnected") {
        store.updateClient(peerId, { status: "connected", type: "relay" });
        this.handleP2PFailure(peerId);
      }
    };

    pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel, peerId);
    };

    return pc;
  }

  private handleP2PFailure(peerId: PeerId) {
    const currentRetries = this.p2pRetryCounts.get(peerId) || 0;
    if (currentRetries < 3) {
      const delay = 2000 * (currentRetries + 1);
      useAppStore
        .getState()
        .addLog(
          `P2P failed with ${peerId.slice(0, 8)}. Retrying in ${delay / 1000}s...`,
          "info",
        );
      this.p2pRetryCounts.set(peerId, currentRetries + 1);
      setTimeout(() => this.initiateP2P(peerId), delay);
    } else {
      useAppStore
        .getState()
        .addLog(
          `P2P failed with ${peerId.slice(0, 8)} after retries. Using Relay.`,
          "info",
        );
    }
  }

  private setupDataChannel(dc: RTCDataChannel, peerId: PeerId) {
    this.dataChannels.set(peerId, dc);
    dc.onopen = () => {
      useAppStore
        .getState()
        .updateClient(peerId, { status: "connected", type: "p2p" });
    };
    dc.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        this.handleIncomingData(payload, peerId, "p2p");
      } catch (err) {
        console.error("P2P Message Error", err);
      }
    };
    dc.onclose = () => {
      this.dataChannels.delete(peerId);
    };
  }

  private async handleOffer(peerId: PeerId, sdp: RTCSessionDescriptionInit) {
    const pc = this.createPeerConnection(peerId);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pc.createAnswer();

      await pc.setLocalDescription(answer);

      this.relay?.sendInternal({
        type: "SIGNAL_ANSWER",
        targetId: peerId,
        sdp: answer,
      });
    } catch (e) {
      console.error("Error handling offer", e);
    }
  }

  private async handleAnswer(peerId: PeerId, sdp: RTCSessionDescriptionInit) {
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
      }
    }
  }

  private async handleCandidate(
    peerId: PeerId,
    candidate: RTCIceCandidateInit,
  ) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    }
  }

  private closePeer(peerId: PeerId) {
    this.peerConnections.get(peerId)?.close();
    this.peerConnections.delete(peerId);
    this.dataChannels.delete(peerId);
  }

  private async handleIncomingData(
    encrypted: EncryptedMessage,
    senderId: PeerId,
    source: "p2p" | "relay",
  ) {
    try {
      const json = await CryptoService.decrypt(encrypted);
      const payload: ClipboardPayload = JSON.parse(json);

      if (this.processedMessageIds.has(payload.id)) {
        return;
      }
      this.processedMessageIds.add(payload.id);

      if (this.processedMessageIds.size > 100) this.processedMessageIds.clear();

      useAppStore
        .getState()
        .addLog(
          `Received clip from ${senderId.slice(0, 8)} (${source})`,
          "success",
        );

      window.dispatchEvent(
        new CustomEvent("clipboard-remote-update", { detail: payload.content }),
      );
    } catch (e) {
      console.error("Decryption failed", e);
      useAppStore
        .getState()
        .addLog(`Decryption failed from ${senderId.slice(0, 8)}`, "error");
    }
  }
}

export const networkService = new NetworkService();
