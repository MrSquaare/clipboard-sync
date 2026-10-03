import type { ClientId } from "@clipboard-sync/shared/schemas/client";
import type {
  ServerClientJoinedMessage,
  ServerClientLeftMessage,
  ServerHelloMessage,
  ServerMessage,
} from "@clipboard-sync/shared/schemas/server";

import {
  type Client,
  type ClientTransportMode,
  useClientsStore,
} from "../stores/clients";
import { Logger } from "./logger";
import { transportService, type TransportService } from "./transport";
import { websocketService, WebSocketService } from "./websocket";

const logger = new Logger("Clients");

export class ClientsService {
  private readonly transport: TransportService;
  private readonly ws: WebSocketService;

  private get clientsStore() {
    return useClientsStore.getState();
  }

  constructor(ws: WebSocketService, transport: TransportService) {
    this.ws = ws;
    this.transport = transport;

    this.setupEventHandlers();
  }

  reset(): void {
    this.clientsStore.reset();
  }

  private handleClientJoined(message: ServerClientJoinedMessage): void {
    const { id, name } = message.payload;

    logger.info(`Client joined: ${name} (${id})`);

    const existing = this.clientsStore.getById(id);

    if (existing) {
      logger.warn(`Client ${id} already exists, updating`);

      this.clientsStore.update(id, { name: name });

      return;
    }

    this.clientsStore.add({
      id: id,
      name: name,
      transport: "relay",
    });
  }

  private handleClientLeft(message: ServerClientLeftMessage): void {
    const { id, name } = message.payload;

    logger.info(`Client left: ${name} (${id})`);

    this.clientsStore.remove(id);
    this.transport.disconnect(id);
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "CLIENT_JOINED":
        this.handleClientJoined(message);

        break;
      case "CLIENT_LEFT":
        this.handleClientLeft(message);

        break;
      case "WELCOME":
        this.handleWelcome(message);

        break;
    }
  }

  private handleTransportMode(
    clientId: ClientId,
    transportMode: ClientTransportMode,
  ): void {
    this.clientsStore.update(clientId, { transport: transportMode });
  }

  private handleWelcome(message: ServerHelloMessage): void {
    const { clients: clientInfos } = message.payload;

    const clients = clientInfos.map<Client>((client) => ({
      id: client.id,
      name: client.name,
      transport: "relay",
    }));

    logger.info(`Room has ${clients.length} other client(s)`);

    this.clientsStore.set(clients);

    const clientIds = clients.map((client) => client.id);

    this.transport.disconnectAll();
    this.transport.initiateAll(clientIds);
  }

  private setupEventHandlers(): void {
    this.ws.on("message", (message) => {
      this.handleMessage(message);
    });
    this.transport.on("transportMode", (senderId, transportMode) => {
      this.handleTransportMode(senderId, transportMode);
    });
  }
}

export const clientsService = new ClientsService(
  websocketService,
  transportService,
);
