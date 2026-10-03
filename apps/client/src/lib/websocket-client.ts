import { EventEmitter } from "./event-emitter";

export type WebSocketClientEventMap = WebSocketClientStateEventMap & {
  error: [unknown];
  message: [WebSocketMessage];
};

export type WebSocketClientOptions = {
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  maxFirstRetries?: number;
  maxRetries?: number;
  protocols?: string | string[];
  url: string;
};

export type WebSocketClientState = keyof WebSocketClientStateEventMap;

export type WebSocketMessage = string;

type RequiredOptions = Required<Omit<WebSocketClientOptions, "protocols">> & {
  protocols?: string | string[];
};

type WebSocketClientStateEventMap = {
  closed: [];
  connected: [];
  connecting: [delay?: number, attempt?: number];
  disconnected: [code: number, reason: string, clean: boolean];
  reconnecting: [delay: number, attempt: number];
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_FIRST_RETRIES = 1;
const DEFAULT_BASE_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 30000;

export class WebSocketClient {
  private readonly events = new EventEmitter<WebSocketClientEventMap>();
  on = this.events.on.bind(this.events);

  get status(): WebSocketClientState {
    return this.state;
  }
  private readonly options: RequiredOptions;
  private retryCount = 0;
  private retryTimer: null | number = null;

  private socket?: WebSocket;

  private state: WebSocketClientState = "disconnected";

  constructor(options: WebSocketClientOptions) {
    this.options = {
      baseBackoffMs: options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS,
      maxBackoffMs: options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS,
      maxFirstRetries: options.maxFirstRetries ?? DEFAULT_MAX_FIRST_RETRIES,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      protocols: options.protocols,
      url: options.url,
    };
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

  connect(): void {
    if (this.state !== "disconnected") {
      return;
    }

    this.resetRetryState();
    this.setState("connecting");
    this.createSocket();
  }

  send(data: WebSocketMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not open.");
    }

    this.socket.send(data);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);

      this.retryTimer = null;
    }
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

  private reconnect(): void {
    if (this.state === "closed") {
      return;
    }

    this.createSocket();
  }

  private resetRetryState(): void {
    this.retryCount = 0;

    this.clearRetryTimer();
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
}
