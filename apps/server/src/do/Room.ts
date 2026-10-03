import type {
  ClientEncryptedPayload,
  ClientHelloMessage,
  ClientId,
  ClientInfo,
  ClientMessage,
  ClientName,
} from "@clipboard-sync/shared/schemas/client";
import type { ServerMessage } from "@clipboard-sync/shared/schemas/server";

import { ClientMessageSchema } from "@clipboard-sync/shared/schemas/client";
import { ServerRoomIDSchema } from "@clipboard-sync/shared/schemas/server";
import { Logger } from "@clipboard-sync/shared/utils/logger";
import { DurableObject } from "cloudflare:workers";

type ClientSession = {
  attachment: ClientSessionAttachment;
  ws: WebSocket;
};

type ClientSessionAttachment = {
  id: ClientId;
  name: ClientName;
};

type ClientUnknownSession = {
  attachment: ClientSessionAttachment | null;
  ws: WebSocket;
};

export class Room extends DurableObject<CloudflareBindings> {
  private readonly decoder: TextDecoder;
  private readonly logger: Logger;

  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);

    this.decoder = new TextDecoder();
    this.logger = new Logger(env.LOG_LEVEL, "Room");
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");

    if (upgradeHeader !== "websocket") {
      this.logger.debug("Non-WebSocket request received", {
        upgradeHeader,
      });

      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const rawRoomId = url.searchParams.get("roomId");
    const result = ServerRoomIDSchema.safeParse(rawRoomId);

    if (!result.success) {
      this.logger.error("Invalid roomId", {
        error: result.error,
        rawRoomId,
      });

      return new Response(result.error.message, {
        status: 400,
      });
    }

    const roomId = result.data;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);

    this.logger.info("New connection", { roomId });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    const attachment = this.getClientSessionAttachment(ws);
    const session: ClientUnknownSession = { attachment, ws };

    if (!this.isValidClientSession(session)) return;

    this.logger.info("Client disconnected", {
      clientId: session.attachment.id,
      code,
      reason,
      wasClean,
    });

    const otherClientSessions = this.getClientSessions({
      exclude: [session.attachment.id],
    });

    this.broadcast(otherClientSessions, {
      payload: this.buildClientInfo(session),
      type: "CLIENT_LEFT",
    });
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    this.logger.error("WebSocket error", { error });

    this.webSocketClose(ws, 1006, `Error: ${error}`, false);
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    const attachment = this.getClientSessionAttachment(ws);
    const session: ClientUnknownSession = { attachment, ws };

    const rawPayload =
      typeof message === "string" ? message : this.decoder.decode(message);

    try {
      const result = ClientMessageSchema.safeParse(JSON.parse(rawPayload));

      if (!result.success) {
        this.logger.error("Invalid message received", {
          clientId: attachment?.id,
          error: result.error,
        });
        this.sendError(session, "Invalid message received");

        return;
      }

      const msg = result.data;

      this.logger.debug("Received message", {
        message: this.getLogClientMessage(msg),
        senderId: attachment?.id,
      });

      if (msg.type === "HELLO") {
        this.handleHello(session, msg.payload);

        return;
      }

      if (!this.isValidClientSession(session)) {
        this.logger.error("Message received before HELLO");
        this.sendError(session, "Message received before HELLO");

        return;
      }

      switch (msg.type) {
        case "LEAVE":
          this.handleLeave(session);

          break;
        case "PING":
          this.handleHeartbeat(session);

          break;
        case "RELAY_BROADCAST":
          this.handleRelayBroadcast(session, msg.targetIds, msg.payload);

          break;
        case "RELAY_SEND":
          this.handleRelaySend(session, msg.targetId, msg.payload);

          break;
      }
    } catch (error) {
      this.logger.error("Error handling message", {
        clientId: attachment?.id,
        error,
      });
      this.sendError(session, "Error handling message");
    }
  }

  private broadcast(targets: ClientSession[], message: ServerMessage) {
    this.logger.debug("Broadcasting message", {
      message: this.getLogServerMessage(message),
      targetIds: targets.map((session) => session.attachment.id),
    });

    for (const target of targets) {
      try {
        this.send(target, message);
      } catch (error) {
        this.logger.error("Broadcast failed", {
          error,
          targetId: target.attachment.id,
        });
      }
    }
  }

  private buildClientInfo(session: ClientSession): ClientInfo {
    return { id: session.attachment.id, name: session.attachment.name };
  }

  private buildClientInfos(sessions: ClientSession[]): ClientInfo[] {
    return sessions.map((session) => this.buildClientInfo(session));
  }

  private buildClientSessionAttachment({
    clientName,
  }: ClientHelloMessage["payload"]): ClientSessionAttachment {
    const id = crypto.randomUUID();

    return { id, name: clientName };
  }

  private getClientSession(clientId: ClientId): ClientSession | null {
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.getClientSessionAttachment(ws);

      if (attachment?.id === clientId) {
        return { attachment, ws };
      }
    }

    return null;
  }

  private getClientSessionAttachment(
    ws: WebSocket,
  ): ClientSessionAttachment | null {
    return ws.deserializeAttachment();
  }

  private getClientSessions({
    exclude,
    include,
  }: {
    exclude?: ClientId[];
    include?: ClientId[];
  }): ClientSession[] {
    const clientSessions: ClientSession[] = [];

    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.getClientSessionAttachment(ws);

      if (!attachment) continue;
      if (include && !include.includes(attachment.id)) continue;
      if (exclude && exclude.includes(attachment.id)) continue;

      clientSessions.push({ attachment, ws });
    }

    return clientSessions;
  }

  private getLogClientMessage(message: ClientMessage) {
    if (message.type === "RELAY_BROADCAST" || message.type === "RELAY_SEND") {
      return {
        type: message.type,
      };
    }

    return message;
  }

  private getLogServerMessage(message: ServerMessage) {
    if (message.type === "RELAY_BROADCAST" || message.type === "RELAY_SEND") {
      return {
        senderId: message.senderId,
        type: message.type,
      };
    }

    return message;
  }

  private handleHeartbeat(session: ClientSession) {
    this.send(session, { type: "PONG" });
  }

  private handleHello(
    session: ClientUnknownSession,
    payload: ClientHelloMessage["payload"],
  ) {
    const attachment =
      session.attachment ?? this.buildClientSessionAttachment(payload);
    const newSession: ClientSession = { attachment, ws: session.ws };

    newSession.ws.serializeAttachment(attachment);

    const otherClientSessions = this.getClientSessions({
      exclude: [newSession.attachment.id],
    });
    const otherClientInfos = this.buildClientInfos(otherClientSessions);

    this.send(newSession, {
      payload: {
        clientId: newSession.attachment.id,
        clients: otherClientInfos,
      },
      type: "WELCOME",
    });

    if (this.isValidClientSession(session)) {
      this.logger.warn("HELLO message received for existing session", {
        clientId: session.attachment.id,
      });

      return;
    }

    const clientInfo = this.buildClientInfo(newSession);

    this.logger.info("Client joined", clientInfo);

    this.broadcast(otherClientSessions, {
      payload: clientInfo,
      type: "CLIENT_JOINED",
    });
  }

  private handleLeave(session: ClientSession) {
    const clientInfo = this.buildClientInfo(session);

    this.logger.info("Client left", clientInfo);

    session.ws.close(1000, "Left by user");
  }

  private handleRelayBroadcast(
    session: ClientSession,
    targetIds: ClientId[] | undefined,
    payload: ClientEncryptedPayload,
  ) {
    const targetSessions = this.getClientSessions({
      exclude: [session.attachment.id],
      include: targetIds,
    });

    this.broadcast(targetSessions, {
      payload: payload,
      senderId: session.attachment.id,
      type: "RELAY_BROADCAST",
    });
  }

  private handleRelaySend(
    session: ClientSession,
    targetId: ClientId,
    payload: ClientEncryptedPayload,
  ) {
    const targetSession = this.getClientSession(targetId);

    if (!targetSession) {
      this.logger.error("Target client not found", { targetId });
      this.sendError(session, "Target client not found");

      return;
    }

    try {
      this.send(targetSession, {
        payload: payload,
        senderId: session.attachment.id,
        type: "RELAY_SEND",
      });
    } catch (error) {
      this.logger.error("Send to target client failed", {
        error,
        targetId: targetSession.attachment.id,
      });
    }
  }

  private isValidClientSession(
    session: ClientUnknownSession,
  ): session is ClientSession {
    return !!session.attachment;
  }

  private send(target: ClientUnknownSession, message: ServerMessage) {
    this.logger.debug("Sending message", {
      message: this.getLogServerMessage(message),
      targetId: target.attachment?.id,
    });

    target.ws.send(JSON.stringify(message));
  }

  private sendError(target: ClientUnknownSession, message: string) {
    try {
      this.send(target, { payload: { message }, type: "ERROR" });
    } catch (error) {
      this.logger.error("Send error message failed", {
        error,
        targetId: target.attachment?.id,
      });
    }
  }
}
