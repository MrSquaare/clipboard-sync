import { invoke } from "@tauri-apps/api/core";

export interface EncryptedMessage {
  iv: string;
  ciphertext: string;
  salt: string;
}

export class CryptoService {
  static async setSecret(secret: string): Promise<void> {
    await invoke("set_secret", { secret });
  }

  static async encrypt(payload: string): Promise<EncryptedMessage> {
    return await invoke<EncryptedMessage>("encrypt_message", { payload });
  }

  static async decrypt(message: EncryptedMessage): Promise<string> {
    return await invoke<string>("decrypt_message", { message });
  }
}
