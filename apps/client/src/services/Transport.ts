import type { PeerId } from "@clipboard-sync/schemas";

import type { EncryptedMessage } from "./CryptoService";

export interface Transport {
  connect(targetId?: PeerId): Promise<void>;
  disconnect(): void;
  send(payload: EncryptedMessage): Promise<void>;
  isConnected(): boolean;
}
