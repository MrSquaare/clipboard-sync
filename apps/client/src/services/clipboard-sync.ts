import type { ClientId } from "@clipboard-sync/shared/schemas/client";

import type { ClipboardUpdateMessage } from "../schemas/clipboard";
import type { Message } from "../schemas/message";

import { EventEmitter } from "../lib/event-emitter";
import { useClipboardStore } from "../stores/clipboard";
import { Logger } from "./logger";
import { transportService, type TransportService } from "./transport";

const logger = new Logger("ClipboardSync");

type ClipboardEventMap = {
  update: [message: ClipboardUpdateMessage];
};

export class ClipboardSyncService {
  private readonly events = new EventEmitter<ClipboardEventMap>();
  on = this.events.on.bind(this.events);

  private readonly transport: TransportService;

  private get clipboardStore() {
    return useClipboardStore.getState();
  }

  constructor(transport: TransportService) {
    this.transport = transport;

    this.setupEventHandlers();
  }

  reset(): void {
    this.clipboardStore.reset();
  }

  async send(content: string): Promise<void> {
    const message: ClipboardUpdateMessage = {
      content,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: "CLIPBOARD_UPDATE",
    };

    await this.transport.broadcast(message);
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

  private handleMessage(senderId: string, message: Message): void {
    switch (message.type) {
      case "CLIPBOARD_UPDATE":
        this.handleClipboardUpdate(senderId, message);

        break;
    }
  }

  private setupEventHandlers(): void {
    this.transport.on("message", (senderId, message) => {
      this.handleMessage(senderId, message);
    });
  }
}

export const clipboardSyncService = new ClipboardSyncService(transportService);
