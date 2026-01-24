import {
  ServerMessageSchema,
  type ClientMessage,
  type PeerId,
  type ServerMessage,
} from "@clipboard-sync/schemas";

import type { EncryptedMessage } from "./crypto";
import type { ConnectionStatus } from "./transport";

export interface SignalingEvents {
  onStatusChange: (status: ConnectionStatus) => void;
  onWelcome: (myId: PeerId, existingPeers: PeerId[]) => void;
  onPeerJoined: (peerId: PeerId) => void;
  onPeerLeft: (peerId: PeerId) => void;
  onSignal: (
    senderId: PeerId,
    type: "offer" | "answer" | "ice",
    data: unknown,
  ) => void;
  onRelayMessage: (senderId: PeerId, payload: EncryptedMessage) => void;
  onError: (error: Error) => void;
}

/**
 * Manages the persistent WebSocket connection to the orchestration server.
 * Handles authentication, room management, and routing of raw messages.
 */
export class SignalingService {
  private ws: WebSocket | null = null;
  private url: string;
  private roomId: string;
  private listener: SignalingEvents | null = null;

  // State
  private status: ConnectionStatus = "disconnected";
  private isIntentionalDisconnect = false;
  private retryCount = 0;
  private readonly maxRetries = 5;
  private retryTimer: number | null = null;
  private pingTimer: number | null = null;
  private messageQueue: ClientMessage[] = [];

  constructor(url: string, roomId: string) {
    this.url = url;
    this.roomId = roomId;
  }

  public setListener(listener: SignalingEvents) {
    this.listener = listener;
  }

  public connect() {
    this.isIntentionalDisconnect = false;
    this.retryCount = 0;
    this.updateStatus("connecting");
    this.establishConnection();
  }

  public disconnect() {
    this.isIntentionalDisconnect = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus("disconnected");
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // --- Sending Methods ---

  public sendRelayData(payload: EncryptedMessage) {
    this.sendInternal({ type: "RELAY_DATA", payload });
  }

  public sendSignal(
    targetId: PeerId,
    type: "offer" | "answer" | "ice",
    data: unknown,
  ) {
    if (type === "offer") {
      this.sendInternal({
        type: "SIGNAL_OFFER",
        targetId,
        sdp: data as RTCSessionDescriptionInit,
      });
    } else if (type === "answer") {
      this.sendInternal({
        type: "SIGNAL_ANSWER",
        targetId,
        sdp: data as RTCSessionDescriptionInit,
      });
    } else if (type === "ice") {
      this.sendInternal({
        type: "SIGNAL_ICE",
        targetId,
        candidate: data as RTCIceCandidateInit,
      });
    }
  }

  // --- Internal Implementation ---

  private establishConnection() {
    if (this.ws) {
      this.ws.close();
    }

    const fullUrl = `${this.url}/ws?roomId=${this.roomId}`;
    try {
      this.ws = new WebSocket(fullUrl);
      this.attachHandlers();
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  private attachHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.updateStatus("connected");
      this.retryCount = 0;
      this.startHeartbeat();

      this.sendInternal({ type: "HELLO", payload: { version: 1 } });
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        if (msg) this.sendInternal(msg);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const result = ServerMessageSchema.safeParse(raw);

        if (!result.success) {
          console.error("[Signaling] Schema Validation Error:", result.error);
          return;
        }

        this.handleServerMessage(result.data);
      } catch (error) {
        console.error("[Signaling] Parse Error:", error);
      }
    };

    this.ws.onclose = (event) => {
      this.clearTimers();
      if (this.isIntentionalDisconnect) {
        this.updateStatus("disconnected");
      } else {
        this.handleUnexpectedDisconnect(event);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[Signaling] WebSocket Error:", error);
    };
  }

  private handleServerMessage(msg: ServerMessage) {
    if (!this.listener) return;

    switch (msg.type) {
      case "WELCOME":
        this.listener.onWelcome(msg.payload.myId, msg.payload.peers);
        break;
      case "PEER_JOINED":
        this.listener.onPeerJoined(msg.payload.peerId);
        break;
      case "PEER_LEFT":
        this.listener.onPeerLeft(msg.payload.peerId);
        break;
      case "RELAY_DATA":
        this.listener.onRelayMessage(
          msg.senderId,
          msg.payload as EncryptedMessage,
        );
        break;
      case "SIGNAL_OFFER":
        this.listener.onSignal(msg.senderId, "offer", msg.sdp);
        break;
      case "SIGNAL_ANSWER":
        this.listener.onSignal(msg.senderId, "answer", msg.sdp);
        break;
      case "SIGNAL_ICE":
        this.listener.onSignal(msg.senderId, "ice", msg.candidate);
        break;
      case "ERROR":
        this.listener.onError(new Error(msg.payload.message));
        break;
    }
  }

  private sendInternal(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      if (msg.type !== "PING") {
        this.messageQueue.push(msg);
      }
    }
  }

  private handleUnexpectedDisconnect(event: CloseEvent) {
    console.warn(`[Signaling] Disconnected (Code: ${event.code})`);
    this.updateStatus("reconnecting");

    if (this.retryCount < this.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
      this.retryCount++;
      console.log(`[Signaling] Reconnecting in ${delay}ms...`);
      this.retryTimer = window.setTimeout(() => {
        this.establishConnection();
      }, delay);
    } else {
      this.updateStatus("disconnected");
      this.listener?.onError(
        new Error("Signaling connection failed after retries"),
      );
    }
  }

  private handleConnectionError(error: Error) {
    console.error("[Signaling] Connection Error:", error);
    this.handleUnexpectedDisconnect({
      code: 1006,
    } as CloseEvent);
  }

  private startHeartbeat() {
    this.clearTimers();
    this.pingTimer = window.setInterval(() => {
      this.sendInternal({ type: "PING" });
    }, 30000);
  }

  private clearTimers() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private updateStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.listener?.onStatusChange(newStatus);
    }
  }
}
