import { DurableObject } from "cloudflare:workers";
import { ClientMessage, ServerMessage, PeerId } from "../types/protocol";
import { logger } from "../utils/logger";

interface SessionAttachment {
  id: PeerId;
}

export class ClipboardRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const peerId = crypto.randomUUID();

    // For Hibernation API, acceptWebSocket(ws, tags)
    // We use the peerId as a tag to find it later
    this.ctx.acceptWebSocket(server, [peerId]);

    // We also store the full metadata in the attachment
    server.serializeAttachment({ id: peerId });

    logger.info(`[Room] New peer connected`, { peerId });

    // Get list of existing peers
    const peers = this.ctx
      .getWebSockets()
      .map((ws) => (ws.deserializeAttachment() as SessionAttachment)?.id)
      .filter((id) => id && id !== peerId) as PeerId[];

    logger.debug(`[Room] Current peers in room`, {
      count: peers.length,
      peers,
    });

    this.send(server, {
      type: "WELCOME",
      payload: { myId: peerId, peers },
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const attachment = ws.deserializeAttachment() as SessionAttachment;
    if (!attachment) return;

    try {
      const msg = JSON.parse(message as string) as ClientMessage;
      logger.debug(`[Room] RX from ${attachment.id}: ${msg.type}`);

      switch (msg.type) {
        case "PING":
          this.send(ws, { type: "PONG" });
          break;

        case "HELLO":
          this.broadcast(
            { type: "PEER_JOINED", payload: { peerId: attachment.id } },
            ws,
          );
          break;

        case "SIGNAL_OFFER":
          this.forwardTo(msg.targetId, {
            type: "SIGNAL_OFFER",
            senderId: attachment.id,
            sdp: msg.sdp,
          });
          break;

        case "SIGNAL_ANSWER":
          this.forwardTo(msg.targetId, {
            type: "SIGNAL_ANSWER",
            senderId: attachment.id,
            sdp: msg.sdp,
          });
          break;

        case "SIGNAL_ICE":
          this.forwardTo(msg.targetId, {
            type: "SIGNAL_ICE",
            senderId: attachment.id,
            candidate: msg.candidate,
          });
          break;

        case "RELAY_DATA":
          this.broadcast(
            {
              type: "RELAY_DATA",
              senderId: attachment.id,
              payload: msg.payload,
            },
            ws,
          );
          break;
      }
    } catch (e) {
      logger.error("[Room] Error handling message", { error: e });
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    const attachment = ws.deserializeAttachment() as SessionAttachment;
    if (attachment) {
      logger.info(
        `[Room] Peer disconnected: ${attachment.id} (code=${code}, reason=${reason}, clean=${wasClean})`,
      );
      this.broadcast({ type: "PEER_LEFT", payload: { peerId: attachment.id } });
    }
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    this.webSocketClose(ws, 1006, `Error: ${error}`, false);
  }

  // --- Helpers ---

  private send(ws: WebSocket, msg: ServerMessage) {
    ws.send(JSON.stringify(msg));
  }

  private broadcast(msg: ServerMessage, exclude?: WebSocket) {
    const str = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== exclude) {
        try {
          ws.send(str);
        } catch (e) {
          logger.error("[Room] Broadcast send failed", { error: e });
        }
      }
    }
  }

  private forwardTo(targetId: PeerId, msg: ServerMessage) {
    const str = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as SessionAttachment;
      if (attachment?.id === targetId) {
        try {
          ws.send(str);
        } catch (e) {
          logger.error("[Room] Forward send failed", { error: e });
        }
        return;
      }
    }
    logger.warn(`[Room] Target peer not found: ${targetId}`);
  }
}
