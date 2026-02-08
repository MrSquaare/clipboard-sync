import type { ClientEncryptedPayload } from "@clipboard-sync/schemas";
import { invoke } from "@tauri-apps/api/core";

export class CryptoService {
  async encryptMessage(plaintext: string): Promise<ClientEncryptedPayload> {
    return invoke("encrypt_message", { plaintext });
  }

  async decryptMessage(payload: ClientEncryptedPayload): Promise<string> {
    return invoke("decrypt_message", { payload });
  }
}

export const cryptoService = new CryptoService();
