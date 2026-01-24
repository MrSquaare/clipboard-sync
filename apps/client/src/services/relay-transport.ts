import {
  ServerMessageSchema,
  type ClientMessage,
  type ServerMessage,
} from "@clipboard-sync/schemas";

import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";

import type { EncryptedMessage } from "./crypto";
import type { Transport } from "./transport";

type MessageHandler = (msg: ServerMessage) => Promise<void> | void;

/**
 * Manages the WebSocket connection to the signaling/relay server.
 */
export class RelayTransport implements Transport {
  private ws: WebSocket | null = null;
  private onMessage: MessageHandler;
  private url: string;
  private roomId: string;
  private isIntentionalClose = false;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimer: number | null = null;
  private pingTimer: number | null = null;

  private initialConnectReject: ((reason?: unknown) => void) | null = null;

  /**
   * Creates a new RelayTransport instance.
   * @param url - The WebSocket server URL.
   * @param roomId - The room ID to join.
   * @param onMessage - Async callback for handling incoming messages.
   */
  constructor(url: string, roomId: string, onMessage: MessageHandler) {
    this.url = url;
    this.roomId = roomId;
    this.onMessage = onMessage;
  }

  /**
   * Connects to the WebSocket server.
   */
  connect(): Promise<void> {
    this.isIntentionalClose = false;
    this.retryCount = 0;

    return new Promise((resolve, reject) => {
      this.initialConnectReject = reject;
      this.setupSocket(resolve);
    });
  }

  private setupSocket(onSuccess: () => void) {
    const fullUrl = `${this.url}/ws?roomId=${this.roomId}`;
    useAppStore
      .getState()
      .addLog(
        `[Relay] Connecting to: ${fullUrl} (Attempt ${this.retryCount + 1})`,
        "info",
      );

    this.ws = new WebSocket(fullUrl);

    this.ws.onopen = () => {
      useAppStore.getState().setConnectionStatus("connected");
      useAppStore.getState().addLog("[Relay] Connected", "success");
      this.sendInternal({ type: "HELLO", payload: { version: 1 } });

      const pingInterval = useSettingsStore.getState().pingInterval;

      if (this.pingTimer) window.clearInterval(this.pingTimer);

      this.pingTimer = window.setInterval(() => {
        this.sendInternal({ type: "PING" });
      }, pingInterval);

      this.retryCount = 0;
      this.initialConnectReject = null;
      onSuccess();
    };

    this.ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const result = ServerMessageSchema.safeParse(raw);

        if (!result.success) {
          console.error("Invalid server message", result.error);
          useAppStore
            .getState()
            .addLog(
              `[Relay] Invalid Msg: ${result.error.issues[0].message}`,
              "error",
            );
          return;
        }

        // Handle async message processing safely
        void Promise.resolve(this.onMessage(result.data)).catch((err) => {
          console.error("Message handler failed", err);
          useAppStore
            .getState()
            .addLog(`[Relay] Message Handler Error: ${err}`, "error");
        });
      } catch (e) {
        console.error("Failed to parse WS message", e);
        useAppStore.getState().addLog(`[Relay] Parse Error: ${e}`, "error");
      }
    };

    this.ws.onerror = (e) => {
      console.error("WS Error", e);
    };

    this.ws.onclose = (e) => {
      useAppStore.getState().setConnectionStatus("disconnected");

      if (this.pingTimer) {
        window.clearInterval(this.pingTimer);

        this.pingTimer = null;
      }

      if (this.isIntentionalClose) {
        useAppStore.getState().addLog(`[Relay] Disconnected by user`, "info");
        return;
      }

      useAppStore
        .getState()
        .addLog(`[Relay] Disconnected (Code: ${e.code}).`, "error");

      if (this.retryCount < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000);

        this.retryCount++;

        useAppStore
          .getState()
          .addLog(`[Relay] Reconnecting in ${delay}ms...`, "info");

        this.retryTimer = setTimeout(() => {
          this.setupSocket(onSuccess);
        }, delay);
      } else {
        useAppStore
          .getState()
          .addLog(`[Relay] Max retries reached. Giving up.`, "error");

        if (this.initialConnectReject) {
          this.initialConnectReject(new Error("Max retries reached"));
          this.initialConnectReject = null;
        }
      }
    };
  }

  /**
   * Sends a raw message to the signaling server.
   */
  sendInternal(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(msg);
      this.ws.send(json);
    } else {
      useAppStore
        .getState()
        .addLog(`[Relay] TX Failed (Not Open): ${msg.type}`, "error");
    }
  }

  /**
   * Sends encrypted data via relay.
   * Alias for send() to satisfy legacy usage or explicit intent.
   */
  sendData(payload: EncryptedMessage) {
    this.send(payload);
  }

  /**
   * Sends encrypted data via relay.
   * Implements Transport interface.
   */
  async send(payload: EncryptedMessage): Promise<void> {
    this.sendInternal({ type: "RELAY_DATA", payload });
  }

  /**
   * Checks if WebSocket is open.
   * Implements Transport interface.
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Sends a LEAVE message to the server.
   */
  sendLeave() {
    this.sendInternal({ type: "LEAVE" });
  }

  /**
   * Disconnects the WebSocket.
   */
  disconnect() {
    this.isIntentionalClose = true;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);

      this.retryTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, "Client Disconnect");
      this.ws = null;
    }
  }
}
