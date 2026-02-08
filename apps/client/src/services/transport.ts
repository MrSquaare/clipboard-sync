import type { ClientId } from "@clipboard-sync/schemas";

import { EventEmitter } from "../lib/event-emitter";
import type { Message } from "../schemas/message";
import { useClientsStore } from "../stores/clients";
import { useSettingsStore } from "../stores/settings";

import { Logger } from "./logger";
import { p2pTransport, type P2PTransport } from "./p2p-transport";
import { relayTransport, type RelayTransport } from "./relay-transport";

const logger = new Logger("Transport");

export type TransportMode = "p2p" | "relay";

type TransportEventMap = {
  transportMode: [senderId: ClientId, transportMode: TransportMode];
  message: [senderId: ClientId, message: Message, transportMode: TransportMode];
};

export class TransportService {
  private readonly relay: RelayTransport;
  private readonly p2p: P2PTransport;
  private readonly events = new EventEmitter<TransportEventMap>();

  on = this.events.on.bind(this.events);

  constructor(relay: RelayTransport, p2p: P2PTransport) {
    this.relay = relay;
    this.p2p = p2p;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.relay.on("message", (senderId, message) => {
      this.events.emit("message", senderId, message, "relay");
    });

    this.p2p.on("connected", (clientId) => {
      this.events.emit("transportMode", clientId, "p2p");
    });

    this.p2p.on("disconnected", (clientId) => {
      this.events.emit("transportMode", clientId, "relay");
    });

    this.p2p.on("message", (senderId, message) => {
      this.events.emit("message", senderId, message, "p2p");
    });
  }

  async broadcast(message: Message): Promise<void> {
    const transportMode = this.transportMode;

    let sentP2P: ClientId[] = [];

    if (transportMode === "auto" || transportMode === "p2p") {
      sentP2P = this.p2p.broadcast(message);

      if (sentP2P.length > 0) {
        logger.debug(`Broadcasted to ${sentP2P.length} peer(s) via P2P`);
      }
    }

    if (transportMode === "auto" || transportMode === "relay") {
      const relayClientIds = this.clients
        .filter((client) => !sentP2P.includes(client.id))
        .map((client) => client.id);

      if (relayClientIds.length > 0) {
        await this.relay.broadcast(relayClientIds, message);

        logger.debug(
          `Broadcasted to ${relayClientIds.length} client(s) via Relay`,
        );
      }
    }
  }

  async sendTo(clientId: ClientId, message: Message): Promise<void> {
    const transportMode = this.transportMode;

    if (transportMode === "auto" || transportMode === "p2p") {
      const sentP2P = this.p2p.sendTo(clientId, message);

      if (sentP2P) {
        logger.debug(`Sent ${message.type} to ${clientId} via P2P`);
        return;
      }
    }

    if (transportMode === "auto" || transportMode === "relay") {
      await this.relay.sendTo(clientId, message);

      logger.debug(`Sent ${message.type} to ${clientId} via Relay`);
    }
  }

  initiate(clientId: ClientId): void {
    if (this.transportMode === "relay") {
      logger.debug("Skipping P2P connection (relay mode)");
      return;
    }

    this.p2p.initiate(clientId);
  }

  initiateAll(clientIds: ClientId[]): void {
    if (this.transportMode === "relay") {
      logger.debug("Skipping P2P connections (relay mode)");
      return;
    }

    this.p2p.initiateAll(clientIds);
  }

  disconnect(clientId: ClientId): void {
    this.p2p.disconnect(clientId);
  }

  disconnectAll(): void {
    this.p2p.disconnectAll();
  }

  private get clients() {
    return useClientsStore.getState().list;
  }

  private get transportMode() {
    return useSettingsStore.getState().transportMode;
  }
}

export const transportService = new TransportService(
  relayTransport,
  p2pTransport,
);
