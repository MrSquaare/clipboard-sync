import type { ClientId } from "@clipboard-sync/shared/schemas/client";

import type { PeerMessage } from "../schemas/peer";

import {
  WEBRTC_DATA_CHANNEL_NAME,
  WEBRTC_DISCONNECTED_GRACE_MS,
  WEBRTC_MAX_FIRST_RESTART_ATTEMPTS,
  WEBRTC_MAX_RESTART_ATTEMPTS,
  WEBRTC_RESTART_BASE_DELAY_MS,
  WEBRTC_RESTART_MAX_DELAY_MS,
  WEBRTC_STUN_SERVER,
} from "../constants";
import { EventEmitter } from "../lib/event-emitter";
import { PeerClient, type PeerSignal } from "../lib/peer-client";
import { type Message, MessageSchema } from "../schemas/message";
import { useSettingsStore } from "../stores/settings";
import { Logger } from "./logger";
import { relayTransport, type RelayTransport } from "./relay-transport";

const logger = new Logger("P2P");

type P2PEventMap = {
  closed: [clientId: ClientId];
  connected: [clientId: ClientId];
  disconnected: [clientId: ClientId];
  error: [clientId: ClientId, error: unknown];
  message: [senderId: ClientId, message: Message];
  reconnecting: [clientId: ClientId];
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: WEBRTC_STUN_SERVER }],
};

export class P2PTransport {
  private readonly events = new EventEmitter<P2PEventMap>();
  on = this.events.on.bind(this.events);
  private readonly peers = new Map<ClientId, PeerClient>();

  private readonly relay: RelayTransport;

  private get settingsStore() {
    return useSettingsStore.getState();
  }

  constructor(relay: RelayTransport) {
    this.relay = relay;

    this.setupEventHandlers();
  }

  broadcast(message: Message): ClientId[] {
    logger.debug(`Broadcasting ${message.type}`);

    const sent: ClientId[] = [];

    for (const clientId of this.peers.keys()) {
      if (this.sendTo(clientId, message)) {
        sent.push(clientId);
      }
    }

    return sent;
  }

  disconnect(clientId: ClientId): void {
    const peer = this.peers.get(clientId);

    if (!peer) {
      return;
    }

    logger.debug(`Disconnecting from ${clientId}`);

    peer.close();
    this.peers.delete(clientId);
  }

  disconnectAll(): void {
    for (const clientId of this.peers.keys()) {
      this.disconnect(clientId);
    }
  }

  initiate(clientId: ClientId): void {
    logger.info(`Initiating with ${clientId}`);

    this.ensurePeer(clientId, true);
  }

  initiateAll(clientIds: ClientId[]): void {
    clientIds.forEach((id) => {
      this.initiate(id);
    });
  }

  sendTo(clientId: ClientId, message: Message): boolean {
    const peer = this.peers.get(clientId);

    if (peer?.status !== "connected") {
      logger.warn(`Cannot send message to ${clientId}: not connected`);

      return false;
    }

    try {
      logger.debug(`Sending ${message.type} to ${clientId}`);

      peer.send(JSON.stringify(message));

      return true;
    } catch (error) {
      logger.error(`Failed to send message to ${clientId}`, error);

      return false;
    }
  }

  private createPeer(clientId: ClientId, initiator: boolean): PeerClient {
    const peer = new PeerClient({
      baseBackoffMs: WEBRTC_RESTART_BASE_DELAY_MS,
      channelLabel: WEBRTC_DATA_CHANNEL_NAME,
      disconnectGraceMs: WEBRTC_DISCONNECTED_GRACE_MS,
      initiator,
      maxBackoffMs: WEBRTC_RESTART_MAX_DELAY_MS,
      maxFirstRetries: WEBRTC_MAX_FIRST_RESTART_ATTEMPTS,
      maxRetries: WEBRTC_MAX_RESTART_ATTEMPTS,
      ordered: true,
      rtcConfig: RTC_CONFIG,
    });

    peer.on("connected", () => {
      logger.info(`Peer ${clientId} connected`);

      this.events.emit("connected", clientId);
    });

    peer.on("reconnecting", (delay, attempt) => {
      logger.info(
        `Peer ${clientId} reconnecting in ${delay}ms (attempt ${attempt})`,
      );

      this.events.emit("reconnecting", clientId);
    });

    peer.on("disconnected", (reason) => {
      logger.debug(
        `Peer ${clientId} disconnected (reason: ${reason ?? "unknown"})`,
      );

      this.events.emit("disconnected", clientId);
      peer.close();
    });

    peer.on("closed", () => {
      logger.info(`Peer ${clientId} closed`);

      this.events.emit("closed", clientId);
      this.peers.delete(clientId);
    });

    peer.on("signal", (signal) => {
      this.handlePeerSignal(clientId, signal);
    });

    peer.on("message", (message) => {
      this.handlePeerMessage(clientId, message);
    });

    peer.on("error", (error) => {
      logger.error(`Peer ${clientId} error`, error);

      this.events.emit("error", clientId, error);
    });

    return peer;
  }

  private ensurePeer(clientId: ClientId, initiator: boolean): PeerClient {
    const existing = this.peers.get(clientId);

    if (existing) {
      return existing;
    }

    const peer = this.createPeer(clientId, initiator);

    this.peers.set(clientId, peer);

    peer.connect();

    return peer;
  }

  private fromPeerMessage(message: PeerMessage): null | PeerSignal {
    switch (message.type) {
      case "PEER_ANSWER":
        return { sdp: message.sdp, type: "answer" };
      case "PEER_ICE":
        return { candidate: message.candidate, type: "candidate" };
      case "PEER_OFFER":
        return { sdp: message.sdp, type: "offer" };
      default:
        return null;
    }
  }

  private handleMessage(senderId: ClientId, message: Message): void {
    switch (message.type) {
      case "PEER_ANSWER":
      case "PEER_ICE":
      case "PEER_OFFER":
        this.handleRelayPeerSignal(senderId, message);

        break;
    }
  }

  private handlePeerMessage(clientId: ClientId, message: string): void {
    try {
      const parsed = JSON.parse(message) as unknown;
      const result = MessageSchema.safeParse(parsed);

      if (!result.success) {
        logger.warn(
          `Invalid message from ${clientId}: ${result.error.message}`,
        );

        return;
      }

      const msg = result.data;

      logger.debug(`Received message ${msg.type} from ${clientId}`);

      this.events.emit("message", clientId, msg);
    } catch (error) {
      logger.error(`Failed to parse message from ${clientId}`, error);
    }
  }

  private async handlePeerSignal(
    clientId: ClientId,
    signal: PeerSignal,
  ): Promise<void> {
    const message = this.toPeerMessage(signal);

    if (!message) {
      return;
    }

    try {
      await this.relay.sendTo(clientId, message);
    } catch (error) {
      logger.error(
        `Failed to send signal ${signal.type} to ${clientId}`,
        error,
      );
    }
  }

  private async handleRelayPeerSignal(
    senderId: ClientId,
    message: PeerMessage,
  ): Promise<void> {
    if (this.settingsStore.transportMode === "relay") {
      logger.debug(
        `Received peer signal ${message.type} from ${senderId} while in relay-only mode, ignoring`,
      );

      return;
    }

    const signal = this.fromPeerMessage(message);

    if (!signal) {
      return;
    }

    const peer = this.ensurePeer(senderId, false);

    try {
      await peer.signal(signal);
    } catch (error) {
      logger.error(
        `Failed to handle signal ${message.type} from ${senderId}`,
        error,
      );
    }
  }

  private setupEventHandlers(): void {
    this.relay.on("message", (senderId, message) => {
      this.handleMessage(senderId, message);
    });
  }

  private toPeerMessage(signal: PeerSignal): null | PeerMessage {
    switch (signal.type) {
      case "answer":
      case "offer":
        return {
          sdp: signal.sdp,
          type: signal.type === "offer" ? "PEER_OFFER" : "PEER_ANSWER",
        };
      case "candidate":
        return {
          candidate: signal.candidate,
          type: "PEER_ICE",
        };
      default:
        return null;
    }
  }
}

export const p2pTransport = new P2PTransport(relayTransport);
