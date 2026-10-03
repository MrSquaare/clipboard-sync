import { AppError } from "./base";

export class CryptoError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);

    this.name = "CryptoError";
  }
}

export class DecryptionError extends CryptoError {
  constructor(message?: string, cause?: unknown) {
    super(message ?? "Failed to decrypt message", cause);

    this.name = "DecryptionError";
  }
}

export class EncryptionError extends CryptoError {
  constructor(message?: string, cause?: unknown) {
    super(message ?? "Failed to encrypt message", cause);

    this.name = "EncryptionError";
  }
}
