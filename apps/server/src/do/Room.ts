import {
  type ClientInfo,
  type ClientEncryptedPayload,
  type ClientHelloMessage,
  type ClientId,
  ClientMessageSchema,
  type ClientName,
  type ServerMessage,
  ServerRoomIDSchema,
  ClientMessage,
} from "@clipboard-sync/schemas";
import { DurableObject } from "cloudflare:workers";

import { Logger } from "../utils/logger";

type ClientSessionAttachment = {
  id: ClientId;
  name: ClientName;
};

type ClientSession = {
  ws: WebSocket;
  attachment: ClientSessionAttachment;
};

type ClientUnknownSession = {
  ws: WebSocket;
  attachment: ClientSessionAttachment | null;
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
      this.logger.error("Invalid roomId in connection attempt", {
        rawRoomId,
        error: result.error,
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

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const attachment = this.getClientSessionAttachment(ws);
    const session: ClientUnknownSession = { ws, attachment };

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
        senderId: attachment?.id,
        message: this.getLogClientMessage(msg),
      });

      if (msg.type === "HELLO") {
        this.handleHello(ws, msg.payload);
        return;
      }

      if (!this.isValidClientSession(session)) {
        console.log(session);
        this.logger.error("Message received before HELLO");
        this.sendError(session, "Message received before HELLO");
        return;
      }

      switch (msg.type) {
        case "PING":
          this.handleHeartbeat(session);
          break;
        case "LEAVE":
          this.handleLeave(session);
          break;
        case "RELAY_BROADCAST":
          this.handleRelayBroadcast(session, msg.payload);
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
      this.sendError(session, "Malformed message payload");
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    const attachment = this.getClientSessionAttachment(ws);
    const session: ClientUnknownSession = { ws, attachment };

    if (!this.isValidClientSession(session)) return;

    this.logger.info("Client disconnected", {
      clientId: session.attachment.id,
      code,
      reason,
      wasClean,
    });

    this.broadcast(
      { type: "CLIENT_LEFT", payload: this.buildClientInfo(session) },
      session,
    );
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    this.logger.error("WebSocket error", { error });

    this.webSocketClose(ws, 1006, `Error: ${error}`, false);
  }

  private handleHello(ws: WebSocket, payload: ClientHelloMessage["payload"]) {
    const attachment = this.buildClientSessionAttachment(payload);
    const session: ClientSession = { ws, attachment };

    ws.serializeAttachment(attachment);

    const clientInfos = this.getClientInfos(attachment.id);

    this.send(session, {
      type: "WELCOME",
      payload: {
        clientId: attachment.id,
        clients: clientInfos,
      },
    });

    const clientInfo = this.buildClientInfo(session);

    this.logger.info("Client joined", clientInfo);

    this.broadcast({ type: "CLIENT_JOINED", payload: clientInfo }, session);
  }

  private handleHeartbeat(session: ClientSession) {
    this.send(session, { type: "PONG" });
  }

  private handleLeave(session: ClientSession) {
    const clientInfo = this.buildClientInfo(session);

    this.logger.info("Client left", clientInfo);

    session.ws.close(1000, "Left by user");
  }

  private handleRelayBroadcast(
    session: ClientSession,
    payload: ClientEncryptedPayload,
  ) {
    this.broadcast(
      {
        type: "RELAY_BROADCAST",
        senderId: session.attachment.id,
        payload,
      },
      session,
    );
  }

  private handleRelaySend(
    session: ClientSession,
    targetId: ClientId,
    payload: ClientEncryptedPayload,
  ) {
    const sent = this.sendTo(targetId, {
      type: "RELAY_SEND",
      senderId: session.attachment.id,
      payload,
    });

    if (!sent) {
      this.sendError(session, `Client ${targetId} not found`);
    }
  }

  private buildClientSessionAttachment({
    clientName,
  }: ClientHelloMessage["payload"]): ClientSessionAttachment {
    const id = crypto.randomUUID();

    return { id, name: clientName };
  }

  private send(session: ClientUnknownSession, message: ServerMessage) {
    this.logger.debug("Sending message", {
      targetId: session.attachment?.id,
      message: this.getLogServerMessage(message),
    });

    session.ws.send(JSON.stringify(message));
  }

  private sendError(session: ClientUnknownSession, message: string) {
    this.send(session, { type: "ERROR", payload: { message } });
  }

  private broadcast(message: ServerMessage, exclude?: ClientSession) {
    this.logger.debug("Broadcasting message", {
      excludeClientId: exclude?.attachment.id,
      message: this.getLogServerMessage(message),
    });

    for (const clientSession of this.getClientSessions(exclude)) {
      try {
        this.send(clientSession, message);
      } catch (error) {
        this.logger.error("Broadcast failed", {
          targetId: clientSession.attachment.id,
          error,
        });
      }
    }
  }

  private sendTo(targetId: ClientId, message: ServerMessage) {
    const targetSession = this.getClientSession(targetId);

    if (!targetSession) {
      this.logger.warn("Target client not found", { targetId });
      return false;
    }

    try {
      this.send(targetSession, message);
      return true;
    } catch (error) {
      this.logger.error("Send to target client failed", {
        targetId: targetSession.attachment.id,
        error,
      });
      return false;
    }
  }

  private isValidClientSession(
    session: ClientUnknownSession,
  ): session is ClientSession {
    return !!session.attachment;
  }

  private getClientSessionAttachment(
    ws: WebSocket,
  ): ClientSessionAttachment | null {
    return ws.deserializeAttachment();
  }

  private getClientSession(clientId: ClientId): ClientSession | null {
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.getClientSessionAttachment(ws);

      if (attachment?.id === clientId) {
        return { ws, attachment };
      }
    }

    return null;
  }

  private getClientSessions(exclude?: ClientSession): ClientSession[] {
    const clientSessions: ClientSession[] = [];

    for (const ws of this.ctx.getWebSockets()) {
      if (ws === exclude?.ws) continue;

      const attachment = this.getClientSessionAttachment(ws);

      if (attachment) {
        clientSessions.push({ ws, attachment });
      }
    }

    return clientSessions;
  }

  private buildClientInfo(session: ClientSession): ClientInfo {
    return { id: session.attachment.id, name: session.attachment.name };
  }

  private getClientInfos(excludeId: ClientId): ClientInfo[] {
    return this.getClientSessions()
      .filter((session) => session.attachment.id !== excludeId)
      .map((session) => this.buildClientInfo(session));
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
        type: message.type,
        senderId: message.senderId,
      };
    }

    return message;
  }
}
