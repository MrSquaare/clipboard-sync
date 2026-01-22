import { z } from "zod";

export const RTCSessionDescriptionInitSchema = z.object({
  type: z.enum(["offer", "answer", "pranswer", "rollback"]),
  sdp: z.string().optional(),
});

export const RTCIceCandidateInitSchema = z.object({
  candidate: z.string().optional(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("HELLO"),
    payload: z.object({ version: z.number() }),
  }),
  z.object({
    type: z.literal("PING"),
  }),
  z.object({
    type: z.literal("SIGNAL_OFFER"),
    targetId: z.string(),
    sdp: RTCSessionDescriptionInitSchema,
  }),
  z.object({
    type: z.literal("SIGNAL_ANSWER"),
    targetId: z.string(),
    sdp: RTCSessionDescriptionInitSchema,
  }),
  z.object({
    type: z.literal("SIGNAL_ICE"),
    targetId: z.string(),
    candidate: RTCIceCandidateInitSchema,
  }),
  z.object({
    type: z.literal("RELAY_DATA"),
    payload: z.object({
      iv: z.string(),
      ciphertext: z.string(),
    }),
  }),
]);

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("WELCOME"),
    payload: z.object({
      myId: z.string(),
      peers: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal("PONG"),
  }),
  z.object({
    type: z.literal("PEER_JOINED"),
    payload: z.object({ peerId: z.string() }),
  }),
  z.object({
    type: z.literal("PEER_LEFT"),
    payload: z.object({ peerId: z.string() }),
  }),
  z.object({
    type: z.literal("SIGNAL_OFFER"),
    senderId: z.string(),
    sdp: RTCSessionDescriptionInitSchema,
  }),
  z.object({
    type: z.literal("SIGNAL_ANSWER"),
    senderId: z.string(),
    sdp: RTCSessionDescriptionInitSchema,
  }),
  z.object({
    type: z.literal("SIGNAL_ICE"),
    senderId: z.string(),
    candidate: RTCIceCandidateInitSchema,
  }),
  z.object({
    type: z.literal("RELAY_DATA"),
    senderId: z.string(),
    payload: z.object({
      iv: z.string(),
      ciphertext: z.string(),
    }),
  }),
  z.object({
    type: z.literal("ERROR"),
    payload: z.object({
      code: z.string(),
      message: z.string(),
    }),
  }),
]);
