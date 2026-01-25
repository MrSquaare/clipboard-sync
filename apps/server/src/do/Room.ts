import {
  ClientMessageSchema,
  ServerMessage,
  PeerId,
} from "@clipboard-sync/schemas";
import { DurableObject } from "cloudflare:workers";

import { Logger } from "../utils/logger";

interface SessionAttachment {
  id: PeerId;
}

export class Room extends DurableObject<CloudflareBindings> {
  private logger: Logger;

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);
    this.logger = new Logger(env.LOG_LEVEL);
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const peerId = crypto.randomUUID();

    this.ctx.acceptWebSocket(server, [peerId]);

    server.serializeAttachment({ id: peerId });

    this.logger.info(`[Room] New peer connected`, { peerId });

    const peers = this.getPeerIds(peerId);

    this.logger.debug(`[Room] Current peers in room`, {
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
      const raw = JSON.parse(message.toString());
      const result = ClientMessageSchema.safeParse(raw);

      if (!result.success) {
        this.logger.warn(`[Room] Invalid message from ${attachment.id}`, {
          error: result.error,
        });
        return;
      }

      const msg = result.data;

      this.logger.debug(`[Room] Message from ${attachment.id}: ${msg.type}`);

      switch (msg.type) {
        case "HELLO":
          this.broadcast(
            { type: "PEER_JOINED", payload: { peerId: attachment.id } },
            ws,
          );
          break;

        case "PING":
          this.send(ws, { type: "PONG" });
          break;

        case "LEAVE":
          ws.close(1000, "Left by user");
          break;

        case "SIGNAL_OFFER":
        case "SIGNAL_ANSWER":
          this.forwardTo(msg.targetId, {
            type: msg.type,
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
      this.logger.error("[Room] Error handling message", { error: e });
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
      this.logger.info(
        `[Room] Peer disconnected: ${attachment.id} (code=${code}, reason=${reason}, clean=${wasClean})`,
      );
      this.broadcast(
        { type: "PEER_LEFT", payload: { peerId: attachment.id } },
        ws,
      );
    }
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    this.webSocketClose(ws, 1006, `Error: ${error}`, false);
  }

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
          this.logger.error("[Room] Broadcast send failed", { error: e });
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
          this.logger.error("[Room] Forward send failed", { error: e });
        }
        return;
      }
    }

    this.logger.warn(`[Room] Target peer not found: ${targetId}`);
  }

  private getPeerIds(excludeId: PeerId): PeerId[] {
    return this.ctx
      .getWebSockets()
      .map((ws) => (ws.deserializeAttachment() as SessionAttachment)?.id)
      .filter((id) => id && id !== excludeId) as PeerId[];
  }
}
