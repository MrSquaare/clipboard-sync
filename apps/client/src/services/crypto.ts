import { invoke } from "@tauri-apps/api/core";

export interface EncryptedMessage {
  /** Initialization vector (Base64 encoded) */
  iv: string;
  /** Encrypted content (Base64 encoded) */
  ciphertext: string;
  /** Salt used for key derivation (Base64 encoded) */
  salt: string;
}

/**
 * Service for handling cryptographic operations via the Tauri backend.
 */
export class CryptoService {
  /**
   * Sets the shared secret for encryption/decryption session.
   * @param secret - The user-provided secret passphrase.
   */
  static async setSecret(secret: string): Promise<void> {
    await invoke("set_secret", { secret });
  }

  /**
   * Encrypts a string payload.
   * @param payload - The raw string content to encrypt.
   * @returns The encrypted message structure.
   */
  static async encrypt(payload: string): Promise<EncryptedMessage> {
    return await invoke<EncryptedMessage>("encrypt_message", { payload });
  }

  /**
   * Decrypts an encrypted message.
   * @param message - The encrypted message structure.
   * @returns The decrypted raw string.
   */
  static async decrypt(message: EncryptedMessage): Promise<string> {
    return await invoke<string>("decrypt_message", { message });
  }
}
