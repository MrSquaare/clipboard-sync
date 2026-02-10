import { AppError } from "./base";

export class ConnectionError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ConnectionError";
  }
}

export class WebSocketError extends ConnectionError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "WebSocketError";
  }
}

export class P2PConnectionError extends ConnectionError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "P2PConnectionError";
  }
}

export class ReconnectionError extends ConnectionError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ReconnectionError";
  }
}
