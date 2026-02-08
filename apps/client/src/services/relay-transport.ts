import type { ClientId, ServerMessage } from "@clipboard-sync/schemas";

import { EventEmitter } from "../lib/event-emitter";
import { MessageSchema, type Message } from "../schemas/message";

import { CryptoService } from "./crypto";
import { Logger } from "./logger";
import { websocketService, type WebSocketService } from "./websocket";

const logger = new Logger("Relay");

type RelayEventMap = {
  message: [senderId: ClientId, message: Message];
};

export class RelayTransport {
  private readonly ws: WebSocketService;
  private readonly crypto = new CryptoService();
  private readonly events = new EventEmitter<RelayEventMap>();

  on = this.events.on.bind(this.events);

  constructor(ws: WebSocketService) {
    this.ws = ws;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on("message", (message) => this.handleMessage(message));
  }

  private async handleMessage(message: ServerMessage): Promise<void> {
    if (message.type !== "RELAY_BROADCAST" && message.type !== "RELAY_SEND") {
      return;
    }

    const { senderId, payload } = message;

    try {
      const decrypted = await this.crypto.decryptMessage(payload);
      const result = MessageSchema.safeParse(JSON.parse(decrypted));

      if (!result.success) {
        logger.warn(
          `Invalid relay message from ${senderId}: ${result.error.message}`,
        );
        return;
      }

      const msg = result.data;

      logger.debug(`Received ${msg.type} from ${senderId}`);

      this.events.emit("message", senderId, msg);
    } catch (error) {
      logger.error(`Failed to handle message from ${senderId}`, error);
    }
  }

  async broadcast(targetIds: ClientId[], message: Message): Promise<void> {
    try {
      logger.debug(`Broadcasting ${message.type}`);

      const payload = await this.crypto.encryptMessage(JSON.stringify(message));

      this.ws.send({
        type: "RELAY_BROADCAST",
        targetIds,
        payload,
      });
    } catch (error) {
      logger.error("Failed to broadcast message", error);
    }
  }

  async sendTo(targetId: ClientId, message: Message): Promise<void> {
    try {
      logger.debug(`Sending ${message.type} to ${targetId}`);

      const payload = await this.crypto.encryptMessage(JSON.stringify(message));

      this.ws.send({
        type: "RELAY_SEND",
        targetId,
        payload,
      });
    } catch (error) {
      logger.error(`Failed to send message to ${targetId}`, error);
    }
  }
}

export const relayTransport = new RelayTransport(websocketService);
