import type { ClientId } from "@clipboard-sync/schemas";

import { EventEmitter } from "../lib/event-emitter";
import type { ClipboardUpdateMessage } from "../schemas/clipboard";
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

  constructor(transport: TransportService) {
    this.transport = transport;

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.transport.on("message", (senderId, message) => {
      if (message.type !== "CLIPBOARD_UPDATE") return;

      this.handleClipboardUpdate(senderId, message);
    });
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

  private get clipboardStore() {
    return useClipboardStore.getState();
  }
}

export const clipboardSyncService = new ClipboardSyncService(transportService);
