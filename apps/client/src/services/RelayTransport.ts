import { ClientMessage, ServerMessage } from "../types/protocol";
import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { ServerMessageSchema } from "../validation/schemas";

type MessageHandler = (msg: ServerMessage) => void;

export class RelayTransport {
  private ws: WebSocket | null = null;
  private onMessage: MessageHandler;
  private url: string;
  private roomId: string;
  private isIntentionalClose = false;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimer: NodeJS.Timeout | null = null;
  private pingTimer: number | null = null;

  private initialConnectReject: ((reason?: unknown) => void) | null = null;

  constructor(url: string, roomId: string, onMessage: MessageHandler) {
    this.url = url;
    this.roomId = roomId;
    this.onMessage = onMessage;
  }

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

        this.onMessage(result.data);
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

  sendData(payload: { iv: string; ciphertext: string; salt: string }) {
    this.sendInternal({ type: "RELAY_DATA", payload });
  }

  disconnect() {
    this.isIntentionalClose = true;

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);

      this.retryTimer = null;
    }

    this.ws?.close();
  }
}
