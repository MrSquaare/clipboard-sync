import { z } from "zod";

import {
  ClientEncryptedPayloadSchema,
  ClientIdSchema,
  ClientInfoSchema,
} from "./client";

export const ServerRoomIDSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.trim() : val),
  z
    .string()
    .min(6, "Room ID must be at least 6 characters")
    .max(64, "Room ID is too long (maximum is 64 characters)"),
);

export type ServerRoomID = z.infer<typeof ServerRoomIDSchema>;

export const ServerHelloMessageSchema = z.object({
  payload: z.object({
    clientId: ClientIdSchema,
    clients: z.array(ClientInfoSchema),
  }),
  type: z.literal("WELCOME"),
});

export type ServerHelloMessage = z.infer<typeof ServerHelloMessageSchema>;

export const ServerHeartbeatMessageSchema = z.object({
  type: z.literal("PONG"),
});

export type ServerHeartbeatMessage = z.infer<
  typeof ServerHeartbeatMessageSchema
>;

export const ServerClientJoinedMessageSchema = z.object({
  payload: ClientInfoSchema,
  type: z.literal("CLIENT_JOINED"),
});

export type ServerClientJoinedMessage = z.infer<
  typeof ServerClientJoinedMessageSchema
>;

export const ServerClientLeftMessageSchema = z.object({
  payload: ClientInfoSchema,
  type: z.literal("CLIENT_LEFT"),
});

export type ServerClientLeftMessage = z.infer<
  typeof ServerClientLeftMessageSchema
>;

export const ServerRelayBroadcastMessageSchema = z.object({
  payload: ClientEncryptedPayloadSchema,
  senderId: ClientIdSchema,
  type: z.literal("RELAY_BROADCAST"),
});

export type ServerRelayBroadcastMessage = z.infer<
  typeof ServerRelayBroadcastMessageSchema
>;

export const ServerRelaySendMessageSchema = z.object({
  payload: ClientEncryptedPayloadSchema,
  senderId: ClientIdSchema,
  type: z.literal("RELAY_SEND"),
});

export type ServerRelaySendMessage = z.infer<
  typeof ServerRelaySendMessageSchema
>;

export const ServerErrorMessageSchema = z.object({
  payload: z.object({
    message: z.string(),
  }),
  type: z.literal("ERROR"),
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
