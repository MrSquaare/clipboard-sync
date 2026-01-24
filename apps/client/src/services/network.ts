import type { ServerMessage, PeerId } from "@clipboard-sync/schemas";

import { useClientStore } from "../store/useClientStore";
import { useClipboardStore } from "../store/useClipboardStore";
import { useLogStore } from "../store/useLogStore";
import { useNetworkStore } from "../store/useNetworkStore";
import { useSettingsStore } from "../store/useSettingsStore";

import { CryptoService, type EncryptedMessage } from "./crypto";
import { P2PTransport, type P2PSignaler } from "./p2p-transport";
import { RelayTransport } from "./relay-transport";

interface ClipboardPayload {
  id: string;
  timestamp: number;
  content: string;
}

/**
 * Service managing network interactions, including P2P connections and Relay fallback.
 */
export class NetworkService {
  private relay: RelayTransport | null = null;
  private p2p: P2PTransport | null = null;
  private processedMessageIds: Set<string> = new Set();
  private messageIdHistory: string[] = []; // Rolling window for deduplication
  private pendingP2PTimeouts: Map<PeerId, ReturnType<typeof setTimeout>> =
    new Map();

  /**
   * Joins a room with the given secret.
   * @param secret - The shared secret for encryption.
   */
  async joinRoom(secret: string) {
    const { serverUrl, roomId } = useSettingsStore.getState();

    await CryptoService.setSecret(secret);

    // Initialize Relay
    this.relay = new RelayTransport(
      serverUrl,
      roomId,
      this.handleServerMessage.bind(this),
    );

    // Initialize P2P with a Signaler interface that uses the Relay
    const signaler: P2PSignaler = {
      sendOffer: (targetId, sdp) =>
        this.relay?.sendInternal({ type: "SIGNAL_OFFER", targetId, sdp }),
      sendAnswer: (targetId, sdp) =>
        this.relay?.sendInternal({ type: "SIGNAL_ANSWER", targetId, sdp }),
      sendCandidate: (targetId, candidate) =>
        this.relay?.sendInternal({ type: "SIGNAL_ICE", targetId, candidate }),
    };

    this.p2p = new P2PTransport(signaler, (msg, senderId) =>
      this.handleIncomingData(msg, senderId, "p2p"),
    );

    await this.relay.connect();
  }

  /**
   * Disconnects from all peers and the relay server.
   */
  disconnect() {
    this.pendingP2PTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.pendingP2PTimeouts.clear();

    if (this.relay) {
      this.relay.sendLeave();
      this.relay.disconnect();
    }

    if (this.p2p) {
      this.p2p.disconnect();
    }

    useClientStore.getState().clearClients();
    useNetworkStore.getState().setConnectionStatus("disconnected");
  }

  /**
   * Broadcasts clipboard content to all connected peers.
   * @param text - The clipboard content to send.
   */
  async broadcastClipboard(text: string) {
    const payload: ClipboardPayload = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      content: text,
    };

    this.trackMessageId(payload.id);

    try {
      const encrypted = await CryptoService.encrypt(JSON.stringify(payload));
      const transportMode = useSettingsStore.getState().transportMode;
      const clients = useClientStore.getState().clients;

      console.log(
        `[Network] Broadcast. Mode: ${transportMode}, Clients: ${clients.length}`,
      );

      let sentP2PCount = 0;

      if (transportMode !== "relay" && this.p2p) {
        // P2PTransport.send without targetId broadcasts to all open channels
        // We need to count how many actually got it. P2PTransport doesn't return that count.
        // But we can check connected P2P clients in the store.
        const connectedP2PClients = clients.filter(
          (c) => c.status === "connected" && c.type === "p2p",
        );

        if (connectedP2PClients.length > 0) {
          await this.p2p.send(encrypted);
          sentP2PCount = connectedP2PClients.length;
        }
      }

      const totalClients = clients.length;
      const shouldRelay =
        transportMode === "relay" ||
        (transportMode === "auto" && sentP2PCount < totalClients);

      if (shouldRelay && this.relay) {
        this.relay.send(encrypted);
        console.log(
          `[Network] Sent via Relay (P2P coverage: ${sentP2PCount}/${totalClients})`,
        );
      }
    } catch (e) {
      console.error("Broadcast failed", e);
      useLogStore.getState().addLog(`Broadcast failed: ${e}`, "error");
    }
  }

  private trackMessageId(id: string) {
    if (this.processedMessageIds.has(id)) return;

    this.processedMessageIds.add(id);
    this.messageIdHistory.push(id);

    // Keep only last 100 messages
    if (this.messageIdHistory.length > 100) {
      const oldestId = this.messageIdHistory.shift();
      if (oldestId) {
        this.processedMessageIds.delete(oldestId);
      }
    }
  }

  private async handleServerMessage(msg: ServerMessage) {
    const logStore = useLogStore.getState();
    const netStore = useNetworkStore.getState();
    const clientStore = useClientStore.getState();

    switch (msg.type) {
      case "WELCOME":
        logStore.addLog(
          `[Network] Joined room as ${msg.payload.myId.slice(0, 8)}`,
          "success",
        );
        netStore.setMyId(msg.payload.myId);
        clientStore.clearClients();

        if (msg.payload.peers.length > 0) {
          logStore.addLog(
            `[Network] Discovered ${msg.payload.peers.length} existing clients`,
            "info",
          );
          msg.payload.peers.forEach((pid) => this.handleFoundClient(pid));
        }
        break;

      case "PEER_JOINED":
        logStore.addLog(
          `[Network] Client joined: ${msg.payload.peerId.slice(0, 8)}`,
          "info",
        );
        this.handleFoundClient(msg.payload.peerId);
        break;

      case "PEER_LEFT":
        logStore.addLog(
          `[Network] Client left: ${msg.payload.peerId.slice(0, 8)}`,
          "info",
        );
        clientStore.removeClient(msg.payload.peerId);
        // P2PTransport handles cleanup on its own if needed, or we can explicit call disconnect?
        // But P2P might not know peer left if connection was still open.
        // It's safer to not manually close P2P unless we want to force it.
        // Actually, if peer left room, P2P should be closed.
        // But P2PTransport doesn't have "disconnectPeer". It clears all on disconnect.
        // We probably need a removePeer in P2PTransport if we want to be strict.
        // For now, let's rely on the transport clearing up naturally or lazily.
        break;

      case "SIGNAL_OFFER":
        if (useSettingsStore.getState().transportMode !== "relay") {
          await this.p2p?.handleOffer(
            msg.senderId,
            msg.sdp as RTCSessionDescriptionInit,
          );
        }
        break;

      case "SIGNAL_ANSWER":
        await this.p2p?.handleAnswer(
          msg.senderId,
          msg.sdp as RTCSessionDescriptionInit,
        );
        break;

      case "SIGNAL_ICE":
        await this.p2p?.handleCandidate(
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
    const { addClient, updateClient } = useClientStore.getState();
    const mode = useSettingsStore.getState().transportMode;

    addClient(peerId);
    updateClient(peerId, { status: "connected", type: "relay" });

    if (mode !== "relay") {
      const existingTimeout = this.pendingP2PTimeouts.get(peerId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const delay = Math.random() * 1000;
      const timeoutId = setTimeout(() => {
        this.pendingP2PTimeouts.delete(peerId);
        // Delegate connection initiation to P2PTransport
        this.p2p?.connect(peerId);
      }, delay);

      this.pendingP2PTimeouts.set(peerId, timeoutId);
    }
  }

  private async handleIncomingData(
    encrypted: EncryptedMessage,
    senderId: PeerId,
    source: "p2p" | "relay",
  ) {
    const logStore = useLogStore.getState();
    const clipboardStore = useClipboardStore.getState();

    try {
      const json = await CryptoService.decrypt(encrypted);
      const payload: ClipboardPayload = JSON.parse(json);

      if (this.processedMessageIds.has(payload.id)) {
        return;
      }

      this.trackMessageId(payload.id);

      logStore.addLog(
        `Received clip from ${senderId.slice(0, 8)} (${source})`,
        "success",
      );

      clipboardStore.setLastRemoteClipboard(payload.content);
    } catch (e) {
      console.error("Decryption failed", e);
      logStore.addLog(
        `Decryption failed from ${senderId.slice(0, 8)}`,
        "error",
      );
    }
  }
}
