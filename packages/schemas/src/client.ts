import { z } from "zod";

export const ClientIdSchema = z.uuidv4("Client ID must be a valid UUIDv4");

export type ClientId = z.infer<typeof ClientIdSchema>;

export const ClientNameSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.trim() : val),
  z
    .string()
    .min(1, "Client name is required")
    .max(64, "Client name is too long (maximum is 64 characters)"),
);

export type ClientName = z.infer<typeof ClientNameSchema>;

export const ClientInfoSchema = z.object({
  id: ClientIdSchema,
  name: ClientNameSchema,
});

export type ClientInfo = z.infer<typeof ClientInfoSchema>;

export const ClientEncryptedPayloadSchema = z.object({
  iv: z.string(),
  ciphertext: z.string(),
  salt: z.string(),
});

export type ClientEncryptedPayload = z.infer<
  typeof ClientEncryptedPayloadSchema
>;

export const ClientRTCSessionDescriptionInitSchema = z.object({
  type: z.enum(["offer", "answer", "pranswer", "rollback"]),
  sdp: z.string().optional(),
});

export type ClientRTCSessionDescriptionInit = z.infer<
  typeof ClientRTCSessionDescriptionInitSchema
>;

export const ClientRTCIceCandidateInitSchema = z.object({
  candidate: z.string().optional(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
});

export type ClientRTCIceCandidateInit = z.infer<
  typeof ClientRTCIceCandidateInitSchema
>;

export const ClientHelloMessageSchema = z.object({
  type: z.literal("HELLO"),
  payload: z.object({
    version: z.number(),
    clientName: ClientNameSchema,
  }),
});

export type ClientHelloMessage = z.infer<typeof ClientHelloMessageSchema>;

export const ClientHeartbeatMessageSchema = z.object({
  type: z.literal("PING"),
});

export type ClientHeartbeatMessage = z.infer<
  typeof ClientHeartbeatMessageSchema
>;

export const ClientLeaveMessageSchema = z.object({
  type: z.literal("LEAVE"),
});

export type ClientLeaveMessage = z.infer<typeof ClientLeaveMessageSchema>;

export const ClientRelayBroadcastMessageSchema = z.object({
  type: z.literal("RELAY_BROADCAST"),
  payload: ClientEncryptedPayloadSchema,
});

export type ClientRelayBroadcastMessage = z.infer<
  typeof ClientRelayBroadcastMessageSchema
>;

export const ClientRelaySendMessageSchema = z.object({
  type: z.literal("RELAY_SEND"),
  targetId: ClientIdSchema,
  payload: ClientEncryptedPayloadSchema,
});

export type ClientRelaySendMessage = z.infer<
  typeof ClientRelaySendMessageSchema
>;

export const ClientMessageSchema = z.discriminatedUnion("type", [
  ClientHelloMessageSchema,
  ClientHeartbeatMessageSchema,
  ClientLeaveMessageSchema,
  ClientRelayBroadcastMessageSchema,
  ClientRelaySendMessageSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
