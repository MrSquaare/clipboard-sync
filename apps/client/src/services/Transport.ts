import { PeerId } from "../types/protocol";
import { EncryptedMessage } from "./CryptoService";

export interface Transport {
  connect(targetId?: PeerId): Promise<void>;
  disconnect(): void;
  send(payload: EncryptedMessage): Promise<void>;
  isConnected(): boolean;
}
