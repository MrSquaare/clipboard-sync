import type { PeerId } from "@clipboard-sync/schemas";

import { useClientStore } from "../store/useClientStore";
import { useClipboardStore } from "../store/useClipboardStore";
import { useLogStore } from "../store/useLogStore";
import { useNetworkStore } from "../store/useNetworkStore";
import { useSettingsStore } from "../store/useSettingsStore";

import { CryptoService, type EncryptedMessage } from "./crypto";
import { P2PTransport } from "./p2p-transport";
import { RelayTransport } from "./relay-transport";
import { SignalingService } from "./signaling";

interface ClipboardPayload {
  id: string;
  timestamp: number;
  content: string;
}

export class NetworkService {
  private signaling: SignalingService | null = null;
  private relay: RelayTransport | null = null;
  private p2p: P2PTransport | null = null;

  private processedMessageIds: Set<string> = new Set();
  private messageIdHistory: string[] = [];

  async joinRoom(secret: string) {
    this.disconnect();

    const { serverUrl, roomId } = useSettingsStore.getState();
    await CryptoService.setSecret(secret);

    // 1. Initialize Signaling
    this.signaling = new SignalingService(serverUrl, roomId);

    // 2. Initialize Transports
    this.relay = new RelayTransport(this.signaling);
    this.p2p = new P2PTransport(this.signaling);

    // 3. Wire up Signaling Events
    this.signaling.setListener({
      onStatusChange: (status) => {
        // Signaling status is effectively Relay status
        useNetworkStore.getState().setConnectionStatus(status);
        this.relay?.handleStatusChange(status);

        if (status === "connected") {
          useLogStore
            .getState()
            .addLog("[Network] Connected to Room", "success");
        } else if (status === "disconnected") {
          useLogStore
            .getState()
            .addLog("[Network] Disconnected from Room", "error");
        }
      },
      onWelcome: (myId, peers) => this.handleWelcome(myId, peers),
      onPeerJoined: (peerId) => this.handlePeerJoined(peerId),
      onPeerLeft: (peerId) => this.handlePeerLeft(peerId),
      onRelayMessage: (senderId, payload) => {
        this.relay?.handleMessage(senderId, payload);
      },
      onSignal: (senderId, type, data) => {
        const mode = useSettingsStore.getState().transportMode;
        if (mode !== "relay" && this.p2p) {
          this.p2p.handleSignal(senderId, type, data);
        }
      },
      onError: (err) => {
        useLogStore
          .getState()
          .addLog(`[Network] Error: ${err.message}`, "error");
        this.relay?.handleError(err);
      },
    });

    // 4. Wire up Transport Events (to handle messages and logs)
    this.relay.setListener({
      onStatusChange: () => {}, // Handled by signaling
      onMessage: (msg, senderId) =>
        this.handleIncomingMessage(msg, senderId, "relay"),
      onError: () => {}, // Handled by signaling
    });

    this.p2p.setListener({
      onStatusChange: () => {},
      onMessage: (msg, senderId) =>
        this.handleIncomingMessage(msg, senderId, "p2p"),
      onError: (e) => console.error("P2P Error", e),
      onPeerConnected: (peerId) => {
        useClientStore
          .getState()
          .updateClient(peerId, { status: "connected", type: "p2p" });
        useLogStore
          .getState()
          .addLog(`[P2P] Connected to ${peerId.slice(0, 8)}`, "success");
      },
      onPeerDisconnected: (peerId) => {
        useClientStore
          .getState()
          .updateClient(peerId, { status: "connected", type: "relay" });
        useLogStore
          .getState()
          .addLog(`[P2P] Disconnected from ${peerId.slice(0, 8)}`, "info");
      },
    });

    // 5. Connect
    this.signaling.connect();
  }

  disconnect() {
    this.signaling?.disconnect();
    this.p2p?.disconnect();
    this.relay?.disconnect();

    this.signaling = null;
    this.p2p = null;
    this.relay = null;

    useClientStore.getState().clearClients();
    useNetworkStore.getState().setConnectionStatus("disconnected");
  }

  async broadcastClipboard(text: string) {
    const payload: ClipboardPayload = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      content: text,
    };

    this.trackMessageId(payload.id);

    try {
      const encrypted = await CryptoService.encrypt(JSON.stringify(payload));
      const mode = useSettingsStore.getState().transportMode;
      const clients = useClientStore.getState().clients;

      let sentViaRelay = false;

      for (const client of clients) {
        let sentToClient = false;

        if (mode !== "relay" && this.p2p) {
          if (client.type === "p2p" && client.status === "connected") {
            await this.p2p.send(encrypted, client.id);
            sentToClient = true;
          }
        }

        if (!sentToClient) {
          if (mode === "relay" || mode === "auto") {
            sentViaRelay = true;
          }
        }
      }

      if (sentViaRelay && this.relay) {
        await this.relay.send(encrypted);
        console.log(`[Network] Broadcasted via Relay`);
      } else {
        console.log(`[Network] Broadcasted via P2P only`);
      }
    } catch (e) {
      console.error("Broadcast failed", e);
      useLogStore.getState().addLog(`Broadcast failed: ${e}`, "error");
    }
  }

  private handleWelcome(myId: PeerId, existingPeers: PeerId[]) {
    useNetworkStore.getState().setMyId(myId);
    useLogStore
      .getState()
      .addLog(`[Network] Joined as ${myId.slice(0, 8)}`, "success");

    const { addClient, updateClient } = useClientStore.getState();
    const mode = useSettingsStore.getState().transportMode;

    existingPeers.forEach((peerId) => {
      addClient(peerId);
      updateClient(peerId, { status: "connected", type: "relay" });

      if (mode !== "relay" && this.p2p) {
        this.p2p.connect(peerId);
      }
    });
  }

  private handlePeerJoined(peerId: PeerId) {
    useClientStore.getState().addClient(peerId);
    useClientStore
      .getState()
      .updateClient(peerId, { status: "connected", type: "relay" });
    useLogStore
      .getState()
      .addLog(`[Network] Peer joined: ${peerId.slice(0, 8)}`, "info");
  }

  private handlePeerLeft(peerId: PeerId) {
    useClientStore.getState().removeClient(peerId);
    useLogStore
      .getState()
      .addLog(`[Network] Peer left: ${peerId.slice(0, 8)}`, "info");
  }

  private async handleIncomingMessage(
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
      this.trackMessageId(payload.id);

      useLogStore
        .getState()
        .addLog(
          `Received clip from ${senderId.slice(0, 8)} (${source})`,
          "success",
        );
      useClipboardStore.getState().setLastRemoteClipboard(payload.content);
    } catch (e) {
      console.error("Decryption failed", e);
    }
  }

  private trackMessageId(id: string) {
    if (this.processedMessageIds.has(id)) return;
    this.processedMessageIds.add(id);
    this.messageIdHistory.push(id);
    if (this.messageIdHistory.length > 100) {
      const oldest = this.messageIdHistory.shift();
      if (oldest) this.processedMessageIds.delete(oldest);
    }
  }
}
