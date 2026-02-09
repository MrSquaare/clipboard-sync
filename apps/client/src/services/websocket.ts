import type {
  ClientMessage,
  ServerMessage,
  ServerRoomID,
} from "@clipboard-sync/schemas";
import { ServerMessageSchema } from "@clipboard-sync/schemas";

import {
  WEBSOCKET_MAX_FIRST_RECONNECT_ATTEMPTS,
  WEBSOCKET_MAX_RECONNECT_ATTEMPTS,
  WEBSOCKET_RECONNECT_BASE_DELAY_MS,
  WEBSOCKET_RECONNECT_MAX_DELAY_MS,
} from "../constants";
import { EventEmitter } from "../lib/event-emitter";
import { WebSocketClient } from "../lib/websocket-client";

import { Logger } from "./logger";

const logger = new Logger("WebSocket");

export type WebSocketServiceConfig = {
  url: string;
  roomId: ServerRoomID;
};

type WebSocketEventMap = {
  connect: [];
  reconnect: [];
  disconnect: [];
  close: [];
  message: [message: ServerMessage];
  error: [];
};

export class WebSocketService {
  private readonly events = new EventEmitter<WebSocketEventMap>();

  private client: WebSocketClient | null = null;

  on = this.events.on.bind(this.events);

  connect(config: WebSocketServiceConfig): void {
    logger.debug("Connecting to server...");

    this.ensureClient(config);
  }

  disconnect(): void {
    if (!this.client) {
      return;
    }

    logger.debug("Disconnecting from server");

    this.client.close();
    this.client = null;
  }

  send(message: ClientMessage): void {
    if (this.client?.status !== "connected") {
      logger.warn(`Cannot send ${message.type}: not connected`);
      return;
    }

    try {
      logger.debug(`Sending message: ${message.type}`);

      this.client.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to send ${message.type}`, error);
    }
  }

  private ensureClient(config: WebSocketServiceConfig): WebSocketClient {
    if (this.client) {
      return this.client;
    }

    const client = this.createClient(config);

    this.client = client;

    client.connect();

    return client;
  }

  private createClient(config: WebSocketServiceConfig): WebSocketClient {
    const wsUrl = `${config.url}/ws?roomId=${encodeURIComponent(config.roomId)}`;

    logger.debug(`Connecting to ${wsUrl}...`);

    const client = new WebSocketClient({
      url: wsUrl,
      maxRetries: WEBSOCKET_MAX_RECONNECT_ATTEMPTS,
      maxFirstRetries: WEBSOCKET_MAX_FIRST_RECONNECT_ATTEMPTS,
      baseBackoffMs: WEBSOCKET_RECONNECT_BASE_DELAY_MS,
      maxBackoffMs: WEBSOCKET_RECONNECT_MAX_DELAY_MS,
    });

    client.on("connected", () => {
      logger.debug("Connected");

      this.events.emit("connect");
    });

    client.on("reconnecting", (delay, attempt) => {
      logger.debug(`Reconnecting in ${delay}ms (attempt ${attempt})`);

      this.events.emit("reconnect");
    });

    client.on("disconnected", (code, reason, clean) => {
      logger.debug(
        `Disconnected (code: ${code}, reason: ${reason}, clean: ${clean})`,
      );

      this.events.emit("disconnect");
    });

    client.on("closed", () => {
      logger.debug("Closed");

      this.events.emit("close");
    });

    client.on("message", (message) => {
      this.handleMessage(message);
    });

    client.on("error", (event) => {
      logger.error("Error", event);

      this.events.emit("error");
    });

    return client;
  }

  private handleMessage(message: string): void {
    try {
      const data: unknown = JSON.parse(message);
      const result = ServerMessageSchema.safeParse(data);

      if (!result.success) {
        logger.warn(`Invalid message: ${result.error.message}`);
        return;
      }

      const msg = result.data;

      logger.debug(`Received message ${msg.type}`);

      this.events.emit("message", msg);
    } catch (error) {
      logger.error("Failed to parse message", error);
    }
  }
}

export const websocketService = new WebSocketService();
