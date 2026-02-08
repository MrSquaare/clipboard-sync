import { z } from "zod";

import {
  ClientEncryptedPayloadSchema,
  ClientIdSchema,
  ClientInfoSchema,
} from "./client";

export const ServerRoomIDSchema = z.preprocess(
  (val) => String(val).trim(),
  z
    .string()
    .min(6, "Room ID must be at least 6 characters")
    .max(64, "Room ID is too long (maximum is 64 characters)"),
);

export type ServerRoomID = z.infer<typeof ServerRoomIDSchema>;

export const ServerHelloMessageSchema = z.object({
  type: z.literal("WELCOME"),
  payload: z.object({
    clientId: ClientIdSchema,
    clients: z.array(ClientInfoSchema),
  }),
});

export type ServerHelloMessage = z.infer<typeof ServerHelloMessageSchema>;

export const ServerHeartbeatMessageSchema = z.object({
  type: z.literal("PONG"),
});

export type ServerHeartbeatMessage = z.infer<
  typeof ServerHeartbeatMessageSchema
>;

export const ServerClientJoinedMessageSchema = z.object({
  type: z.literal("CLIENT_JOINED"),
  payload: ClientInfoSchema,
});

export type ServerClientJoinedMessage = z.infer<
  typeof ServerClientJoinedMessageSchema
>;

export const ServerClientLeftMessageSchema = z.object({
  type: z.literal("CLIENT_LEFT"),
  payload: ClientInfoSchema,
});

export type ServerClientLeftMessage = z.infer<
  typeof ServerClientLeftMessageSchema
>;

export const ServerRelayBroadcastMessageSchema = z.object({
  type: z.literal("RELAY_BROADCAST"),
  senderId: ClientIdSchema,
  payload: ClientEncryptedPayloadSchema,
});

export type ServerRelayBroadcastMessage = z.infer<
  typeof ServerRelayBroadcastMessageSchema
>;

export const ServerRelaySendMessageSchema = z.object({
  type: z.literal("RELAY_SEND"),
  senderId: ClientIdSchema,
  payload: ClientEncryptedPayloadSchema,
});

export type ServerRelaySendMessage = z.infer<
  typeof ServerRelaySendMessageSchema
>;

export const ServerErrorMessageSchema = z.object({
  type: z.literal("ERROR"),
  payload: z.object({
    message: z.string(),
  }),
});

export type ServerErrorMessage = z.infer<typeof ServerErrorMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion("type", [
  ServerHelloMessageSchema,
  ServerHeartbeatMessageSchema,
  ServerClientJoinedMessageSchema,
  ServerClientLeftMessageSchema,
  ServerRelayBroadcastMessageSchema,
  ServerRelaySendMessageSchema,
  ServerErrorMessageSchema,
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;
