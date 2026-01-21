import { ClientMessage, ServerMessage } from "../types/protocol";
import { useAppStore } from "../store/useAppStore";

type MessageHandler = (msg: ServerMessage) => void;

export class RelayTransport {
  private ws: WebSocket | null = null;
  private onMessage: MessageHandler;
  private url: string;
  private roomId: string;

  constructor(url: string, roomId: string, onMessage: MessageHandler) {
    this.url = url;
    this.roomId = roomId;
    this.onMessage = onMessage;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const fullUrl = `${this.url}/ws?roomId=${this.roomId}`;
      useAppStore
        .getState()
        .addLog(`[Relay] Connecting to: ${fullUrl}`, "info");

      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        useAppStore.getState().setConnectionStatus("connected");
        useAppStore.getState().addLog("[Relay] Connected", "success");
        this.sendInternal({ type: "HELLO", payload: { version: 1 } });
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          useAppStore
            .getState()
            .addLog(`[Relay] RX: ${event.data.slice(0, 100)}`, "info");
          const msg = JSON.parse(event.data) as ServerMessage;
          this.onMessage(msg);
        } catch (e) {
          console.error("Failed to parse WS message", e);
          useAppStore.getState().addLog(`[Relay] Parse Error: ${e}`, "error");
        }
      };

      this.ws.onerror = (e) => {
        console.error("WS Error", e);
        useAppStore.getState().addLog("[Relay] Connection Error", "error");
        reject(e);
      };

      this.ws.onclose = (e) => {
        useAppStore.getState().setConnectionStatus("disconnected");
        useAppStore
          .getState()
          .addLog(`[Relay] Disconnected (Code: ${e.code})`, "error");
      };
    });
  }

  sendInternal(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(msg);
      useAppStore.getState().addLog(`[Relay] TX: ${msg.type}`, "info");
      this.ws.send(json);
    } else {
      useAppStore
        .getState()
        .addLog(`[Relay] TX Failed (Not Open): ${msg.type}`, "error");
    }
  }

  // Implementation of abstract-like sending for data
  // But wait, relay sends specific RELAY_DATA messages.
  sendData(payload: unknown) {
    this.sendInternal({ type: "RELAY_DATA", payload });
  }

  disconnect() {
    this.ws?.close();
  }
}
