import type { ClientId } from "@clipboard-sync/schemas";

import { EventEmitter } from "../lib/event-emitter";
import type { ClipboardUpdateMessage } from "../schemas/clipboard";
import type { Message } from "../schemas/message";
import { useClipboardStore } from "../stores/clipboard";

import { Logger } from "./logger";
import { transportService, type TransportService } from "./transport";

const logger = new Logger("ClipboardSync");

type ClipboardEventMap = {
  update: [message: ClipboardUpdateMessage];
};

export class ClipboardSyncService {
  private readonly transport: TransportService;
  private readonly events = new EventEmitter<ClipboardEventMap>();

  on = this.events.on.bind(this.events);

  send(content: string): void {
    const message: ClipboardUpdateMessage = {
      type: "CLIPBOARD_UPDATE",
      id: crypto.randomUUID(),
      content,
      timestamp: Date.now(),
    };

    this.transport.broadcast(message);
  }

  reset(): void {
    this.clipboardStore.reset();
  }

  constructor(transport: TransportService) {
    this.transport = transport;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.transport.on("message", (senderId, message) => {
      this.handleMessage(senderId, message);
    });
  }

  private handleMessage(senderId: string, message: Message): void {
    switch (message.type) {
      case "CLIPBOARD_UPDATE":
        this.handleClipboardUpdate(senderId, message);
        break;
    }
  }

  private handleClipboardUpdate(
    senderId: ClientId,
    message: ClipboardUpdateMessage,
  ): void {
    const { lastMessage } = this.clipboardStore;

    if (message.id === lastMessage?.id) {
      logger.debug(`Ignoring duplicate clipboard update: ${message.id}`);
      return;
    }

    logger.info(`Clipboard received from ${senderId}`);

    this.clipboardStore.setLastMessage(message);
    this.events.emit("update", message);
  }

  private get clipboardStore() {
    return useClipboardStore.getState();
  }
}

export const clipboardSyncService = new ClipboardSyncService(transportService);
