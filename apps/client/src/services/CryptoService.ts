import { invoke } from "@tauri-apps/api/core";

export interface EncryptedMessage {
  iv: string;
  ciphertext: string;
}

export class CryptoService {
  static async setSecret(secret: string, salt: string): Promise<void> {
    await invoke("set_secret", { secret, salt });
  }

  static async encrypt(payload: string): Promise<EncryptedMessage> {
    return await invoke<EncryptedMessage>("encrypt_message", { payload });
  }

  static async decrypt(message: EncryptedMessage): Promise<string> {
    return await invoke<string>("decrypt_message", { message });
  }
}
