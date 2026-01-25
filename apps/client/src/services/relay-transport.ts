import type { PeerId } from "@clipboard-sync/schemas";

import type { EncryptedMessage } from "./crypto";
import type { SignalingService } from "./signaling";
import type { Transport, TransportEvents } from "./transport";

/**
 * Wraps the SignalingService to act as a Transport for encrypted data payloads.
 * This allows the NetworkManager to treat Relay just like P2P.
 */
export class RelayTransport implements Transport {
  private signaling: SignalingService;
  private listener: TransportEvents | null = null;

  constructor(signaling: SignalingService) {
    this.signaling = signaling;
  }

  public setListener(listener: TransportEvents): void {
    this.listener = listener;
  }

  public async connect(_targetId?: PeerId): Promise<void> {
    // Relay is connected when Signaling is connected.
    // If Signaling is already connected, we just emit status.
    if (this.signaling.isConnected()) {
      this.listener?.onStatusChange("connected");
    } else {
      // We generally assume the Manager connects Signaling explicitly,
      // but this could trigger it if we wanted strict autonomy.
      // For this design, we assume 'connect' here is a no-op
      // because Signaling is managed at a higher level,
      // OR we map it to ensuring Signaling is up.
    }
  }

  public disconnect(): void {
    // We do NOT disconnect the signaling service here,
    // because P2P might still need it.
    // We just stop reporting "connected" for this transport view.
    this.listener?.onStatusChange("disconnected");
  }

  public async send(
    payload: EncryptedMessage,
    _targetId?: PeerId,
  ): Promise<void> {
    this.signaling.sendRelayData(payload);
  }

  // --- External Hooks ---

  // These are called by the Manager when events come from Signaling

  public handleStatusChange(
    status: "disconnected" | "connecting" | "connected" | "reconnecting",
  ) {
    this.listener?.onStatusChange(status);
  }

  public handleMessage(senderId: PeerId, payload: EncryptedMessage) {
    this.listener?.onMessage(payload, senderId);
  }

  public handleError(error: Error) {
    this.listener?.onError(error);
  }
}
