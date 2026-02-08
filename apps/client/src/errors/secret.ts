import { AppError } from "./base";

export class SecretError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "SecretError";
  }
}

export class SecretLoadError extends SecretError {
  constructor(cause?: unknown) {
    super("Failed to load secret", cause);
    this.name = "SecretLoadError";
  }
}

export class SecretSaveError extends SecretError {
  constructor(cause?: unknown) {
    super("Failed to save secret", cause);
    this.name = "SecretSaveError";
  }
}
