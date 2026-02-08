import { AppError } from "./base";

export class ClipboardError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "ClipboardError";
  }
}

export class ClipboardReadError extends ClipboardError {
  constructor(cause?: unknown) {
    super("Failed to read from clipboard", cause);
    this.name = "ClipboardReadError";
  }
}

export class ClipboardWriteError extends ClipboardError {
  constructor(cause?: unknown) {
    super("Failed to write to clipboard", cause);
    this.name = "ClipboardWriteError";
  }
}

export class ClipboardEmptyError extends ClipboardError {
  constructor() {
    super("Clipboard is empty");
    this.name = "ClipboardEmptyError";
  }
}
