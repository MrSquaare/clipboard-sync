import type {
  ServerHelloMessage,
  ServerMessage,
} from "@clipboard-sync/schemas";

import { useConnectionStore } from "../stores/connection";
import { useSettingsStore } from "../stores/settings";

import { Logger } from "./logger";
import { websocketService, WebSocketService } from "./websocket";

const logger = new Logger("Connection");

export class ConnectionService {
  private readonly ws: WebSocketService;
  private pingTimer: number | null = null;

  connect(): void {
    const { serverUrl, roomId } = this.settingsStore;

    logger.info(`Connecting to room ${roomId}`);

    this.connectionStore.setStatus("connecting");
    this.connectionStore.setError(null);

    this.ws.connect({
      url: serverUrl,
      roomId,
    });
  }

  disconnect(): void {
    logger.info("Disconnecting from server");

    this.connectionStore.setStatus("disconnecting");
    this.connectionStore.setError(null);

    this.stopPing();
    this.ws.send({ type: "LEAVE" });
    this.ws.disconnect();
  }

  constructor(ws: WebSocketService) {
    this.ws = ws;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on("connected", () => this.handleConnected());
    this.ws.on("reconnecting", () => this.handleReconnecting());
    this.ws.on("disconnected", () => this.handleDisconnected());
    this.ws.on("closed", () => this.handleClosed());
    this.ws.on("message", (message) => this.handleMessage(message));
    this.ws.on("error", () => this.handleError());
  }

  private handleConnected(): void {
    const { clientName } = this.settingsStore;

    logger.debug(`Sending HELLO with client name: ${clientName}`);

    this.ws.send({
      type: "HELLO",
      payload: {
        version: 1,
        clientName,
      },
    });

    this.startPing();
  }

  private handleReconnecting(): void {
    logger.info("Reconnecting to server...");

    this.connectionStore.setStatus("reconnecting");
  }

  private handleDisconnected(): void {
    logger.info("Disconnected from server");

    this.stopPing();
    this.connectionStore.setStatus("disconnected");
  }

  private handleClosed(): void {
    logger.info("Connection closed");
  }

  private handleError(): void {
    logger.error("Unknown server error");

    this.connectionStore.setError("Unknown server error");
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case "WELCOME":
        this.handleWelcome(message);
        break;
    }
  }

  private handleWelcome(message: ServerHelloMessage): void {
    const { clientId } = message.payload;

    logger.info(`Connected with client ID: ${clientId}`);

    this.connectionStore.setClientId(clientId);
    this.connectionStore.setStatus("connected");
    this.connectionStore.setError(null);
  }

  private startPing(): void {
    this.stopPing();

    const { pingInterval } = this.settingsStore;

    logger.debug(`Starting ping timer with ${pingInterval}ms interval`);

    this.pingTimer = window.setInterval(() => {
      this.ws.send({ type: "PING" });
    }, pingInterval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;

      logger.debug("Ping timer stopped");
    }
  }

  private get connectionStore() {
    return useConnectionStore.getState();
  }

  private get settingsStore() {
    return useSettingsStore.getState();
  }
}

export const connectionService = new ConnectionService(websocketService);
