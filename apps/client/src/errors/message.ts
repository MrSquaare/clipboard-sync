import { AppError } from "./base";

export class MessageError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "MessageError";
  }
}

export class InvalidMessageError extends MessageError {
  constructor(cause?: unknown) {
    super("Invalid message received", cause);
    this.name = "InvalidMessageError";
  }
}

export class MessageParseError extends MessageError {
  constructor(cause?: unknown) {
    super("Failed to parse message", cause);
    this.name = "MessageParseError";
  }
}
