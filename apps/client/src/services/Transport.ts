import type { PeerId } from "@clipboard-sync/schemas";

import type { EncryptedMessage } from "./crypto";

/**
 * Interface defining the contract for any network transport (Relay, P2P, etc.).
 */
export interface Transport {
  /**
   * Establishes a connection.
   * @param targetId - Optional peer ID to connect to (for P2P).
   */
  connect(targetId?: PeerId): Promise<void>;

  /**
   * Disconnects and cleans up resources.
   */
  disconnect(): void;

  /**
   * Sends an encrypted message via the transport.
   * @param payload - The encrypted payload to send.
   * @param targetId - Optional specific peer to send to.
   */
  send(payload: EncryptedMessage, targetId?: PeerId): Promise<void>;

  /**
   * Checks if the transport is currently connected.
   */
  isConnected(): boolean;
}
