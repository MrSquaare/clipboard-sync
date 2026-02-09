import { EventEmitter } from "./event-emitter";

export type WebSocketMessage = string;

type WebSocketClientStateEventMap = {
  disconnected: [code: number, reason: string, clean: boolean];
  connecting: [delay?: number, attempt?: number];
  connected: [];
  reconnecting: [delay: number, attempt: number];
  closed: [];
};

export type WebSocketClientState = keyof WebSocketClientStateEventMap;

export type WebSocketClientEventMap = WebSocketClientStateEventMap & {
  message: [WebSocketMessage];
  error: [unknown];
};

export type WebSocketClientOptions = {
  url: string;
  protocols?: string | string[];
  maxRetries?: number;
  maxFirstRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
};

type RequiredOptions = Required<Omit<WebSocketClientOptions, "protocols">> & {
  protocols?: string | string[];
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_FIRST_RETRIES = 1;
const DEFAULT_BASE_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 30000;

export class WebSocketClient {
  private readonly options: RequiredOptions;
  private readonly events = new EventEmitter<WebSocketClientEventMap>();

  private socket?: WebSocket;
  private state: WebSocketClientState = "disconnected";
  private retryCount = 0;
  private retryTimer: number | null = null;

  on = this.events.on.bind(this.events);

  constructor(options: WebSocketClientOptions) {
    this.options = {
      url: options.url,
      protocols: options.protocols,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      maxFirstRetries: options.maxFirstRetries ?? DEFAULT_MAX_FIRST_RETRIES,
      baseBackoffMs: options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS,
      maxBackoffMs: options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
    };
  }

  get status(): WebSocketClientState {
    return this.state;
  }

  connect(): void {
    if (this.state !== "disconnected") {
      return;
    }

    this.resetRetryState();
    this.setState("connecting");
    this.createSocket();
  }

  close(): void {
    if (this.state === "closed") {
      return;
    }

    this.resetRetryState();
    this.setState("closed");
    this.events.clearAll();
    this.teardownSocket(1000, "Client closed");
  }

  send(data: WebSocketMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not open.");
    }

    this.socket.send(data);
  }

  private createSocket(): void {
    this.teardownSocket(1000, "Reconnecting");

    const socket = new WebSocket(this.options.url, this.options.protocols);

    this.socket = socket;

    socket.onopen = () => {
      this.markConnected();
    };

    socket.onclose = (event) => {
      this.markDisconnected(event.code, event.reason, event.wasClean);
    };

    socket.onmessage = (event) => {
      this.events.emit("message", event.data);
    };

    socket.onerror = (event) => {
      this.events.emit("error", event);
    };
  }

  private teardownSocket(code: number, reason: string): void {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;

    this.socket = undefined;

    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close(code, reason);
    }
  }

  private scheduleReconnect(): boolean {
    if (this.retryTimer || this.state === "closed") {
      return false;
    }

    const maxRetries =
      this.state === "connecting"
        ? this.options.maxFirstRetries
        : this.options.maxRetries;

    if (this.retryCount >= maxRetries) {
      return false;
    }

    const delay = Math.min(
      this.options.baseBackoffMs * 2 ** this.retryCount,
      this.options.maxBackoffMs,
    );
    const attempt = this.retryCount + 1;

    if (this.state === "connecting") {
      this.setState("connecting", delay, attempt);
    } else {
      this.setState("reconnecting", delay, attempt);
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.retryCount += 1;
      this.reconnect();
    }, delay);

    return true;
  }

  private reconnect(): void {
    if (this.state === "closed") {
      return;
    }

    this.createSocket();
  }

  private markConnected(): void {
    this.resetRetryState();
    this.setState("connected");
  }

  private markDisconnected(code: number, reason: string, clean: boolean): void {
    if (this.state === "closed") {
      return;
    }

    if (!this.scheduleReconnect()) {
      this.setState("disconnected", code, reason, clean);
    }
  }

  private resetRetryState(): void {
    this.retryCount = 0;
    this.clearRetryTimer();
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private setState<T extends WebSocketClientState>(
    state: T,
    ...args: WebSocketClientEventMap[T]
  ): void {
    if (
      this.state === state &&
      state !== "connecting" &&
      state !== "reconnecting"
    ) {
      return;
    }

    this.state = state;
    this.events.emit(state, ...args);
  }
}
