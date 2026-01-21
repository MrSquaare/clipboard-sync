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

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" },
    ],
  };

  async joinRoom(secret: string) {
    const { serverUrl, roomId } = useSettingsStore.getState();

    // 1. Setup Crypto
    await CryptoService.setSecret(secret, roomId);

    // 2. Connect Relay
    this.relay = new RelayTransport(
      serverUrl,
      roomId,
      this.handleServerMessage.bind(this),
    );
    await this.relay.connect();
  }

  disconnect() {
    this.relay?.disconnect();
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
    useAppStore.getState().setConnectionStatus("disconnected");
  }

  // --- Broadcast Logic ---

  async broadcastClipboard(text: string) {
    console.log(`[Network] Broadcasting clipboard: ${text.length} chars`);
    const payload: ClipboardPayload = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      content: text,
    };

    // Mark as processed so we don't loop back
    this.processedMessageIds.add(payload.id);

    try {
      const encrypted = await CryptoService.encrypt(JSON.stringify(payload));
      const transportMode = useSettingsStore.getState().transportMode;
      const peers = useAppStore.getState().peers;

      console.log(
        `[Network] Payload encrypted. Mode: ${transportMode}, Peers: ${peers.length}`,
      );

      let sentP2PCount = 0;

      // 1. Try P2P
      if (transportMode !== "relay") {
        const msgStr = JSON.stringify(encrypted);
        this.dataChannels.forEach((dc) => {
          if (dc.readyState === "open") {
            console.log(`[Network] Sending P2P to peer`);
            dc.send(msgStr);
            sentP2PCount++;
          }
        });
      }

      // 2. Fallback to Relay
      const totalPeers = peers.length;
      const shouldRelay =
        transportMode === "relay" ||
        (transportMode === "auto" && sentP2PCount < totalPeers);

      console.log(
        `[Network] P2P sent: ${sentP2PCount}/${totalPeers}. Relaying? ${shouldRelay}`,
      );

      if (shouldRelay && this.relay) {
        this.relay.sendData(encrypted);
        console.log(`[Network] Sent via Relay`);
      }
    } catch (e) {
      console.error("Broadcast failed", e);
      useAppStore.getState().addLog(`Broadcast failed: ${e}`, "error");
    }
  }

  // --- Signaling Handling ---

  private async handleServerMessage(msg: ServerMessage) {
    const store = useAppStore.getState();
    store.addLog(`[Network] Handling ${msg.type}`, "info");

    switch (msg.type) {
      case "WELCOME":
        store.addLog(
          `[Network] Welcome. My ID: ${msg.payload.myId}`,
          "success",
        );
        store.setMyId(msg.payload.myId);
        if (msg.payload.peers.length > 0) {
          store.addLog(
            `[Network] Found existing peers: ${msg.payload.peers.join(", ")}`,
            "info",
          );
          msg.payload.peers.forEach((pid) => this.initiateP2P(pid));
        } else {
          store.addLog(`[Network] No other peers in room.`, "info");
        }
        break;

      case "PEER_JOINED":
        store.addPeer(msg.payload.peerId);
        store.addLog(`Peer joined: ${msg.payload.peerId.slice(0, 8)}`, "info");
        break;

      case "PEER_LEFT":
        store.removePeer(msg.payload.peerId);
        this.closePeer(msg.payload.peerId);
        break;

      case "SIGNAL_OFFER":
        await this.handleOffer(
          msg.senderId,
          msg.sdp as RTCSessionDescriptionInit,
        );
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

  // --- WebRTC Implementation ---

  private initiateP2P(peerId: PeerId) {
    if (useSettingsStore.getState().transportMode === "relay") return;

    useAppStore.getState().addPeer(peerId);
    useAppStore.getState().updatePeer(peerId, { status: "connecting" });

    const pc = this.createPeerConnection(peerId);
    const dc = pc.createDataChannel("clipboard");
    this.setupDataChannel(dc, peerId);

    pc.createOffer().then((offer) => {
      pc.setLocalDescription(offer);
      this.relay?.sendInternal({
        type: "SIGNAL_OFFER",
        targetId: peerId,
        sdp: offer,
      });
    });
  }

  private createPeerConnection(peerId: PeerId): RTCPeerConnection {
    if (this.peerConnections.has(peerId))
      return this.peerConnections.get(peerId)!;

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
      const status =
        state === "connected"
          ? "connected"
          : state === "failed" || state === "closed"
            ? "disconnected"
            : "connecting";

      useAppStore.getState().updatePeer(peerId, {
        status,
        type: state === "connected" ? "p2p" : "relay",
      });
    };

    pc.ondatachannel = (e) => {
      this.setupDataChannel(e.channel, peerId);
    };

    return pc;
  }

  private setupDataChannel(dc: RTCDataChannel, peerId: PeerId) {
    this.dataChannels.set(peerId, dc);
    dc.onopen = () => {
      useAppStore
        .getState()
        .updatePeer(peerId, { status: "connected", type: "p2p" });
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
    if (useSettingsStore.getState().transportMode === "relay") return;

    useAppStore.getState().addPeer(peerId);
    const pc = this.createPeerConnection(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.relay?.sendInternal({
      type: "SIGNAL_ANSWER",
      targetId: peerId,
      sdp: answer,
    });
  }

  private async handleAnswer(peerId: PeerId, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }

  private async handleCandidate(
    peerId: PeerId,
    candidate: RTCIceCandidateInit,
  ) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private closePeer(peerId: PeerId) {
    this.peerConnections.get(peerId)?.close();
    this.peerConnections.delete(peerId);
    this.dataChannels.delete(peerId);
  }

  // --- Incoming Data Handling ---

  private async handleIncomingData(
    encrypted: EncryptedMessage,
    _senderId: PeerId,
    source: "p2p" | "relay",
  ) {
    console.log(`[Network] Incoming data from ${_senderId} (${source})`);
    try {
      const json = await CryptoService.decrypt(encrypted);
      const payload: ClipboardPayload = JSON.parse(json);

      if (this.processedMessageIds.has(payload.id)) {
        console.log(`[Network] Ignoring duplicate message: ${payload.id}`);
        return;
      }
      this.processedMessageIds.add(payload.id);

      // Cleanup old IDs
      if (this.processedMessageIds.size > 100) this.processedMessageIds.clear();

      useAppStore
        .getState()
        .addLog(`Received clip from ${_senderId} (${source})`, "success");
      console.log(
        `[Network] Dispatching update event. Content len: ${payload.content.length}`,
      );

      // Dispatch event for UI/Clipboard hook
      window.dispatchEvent(
        new CustomEvent("clipboard-remote-update", { detail: payload.content }),
      );
    } catch (e) {
      console.error("Decryption failed", e);
      useAppStore
        .getState()
        .addLog(`Decryption failed from ${_senderId}`, "error");
    }
  }
}

export const networkService = new NetworkService();
