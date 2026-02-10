import { z } from "zod";

export const PeerOfferMessageSchema = z.object({
  type: z.literal("PEER_OFFER"),
  sdp: z.string().optional(),
});

export type PeerOfferMessage = z.infer<typeof PeerOfferMessageSchema>;

export const PeerAnswerMessageSchema = z.object({
  type: z.literal("PEER_ANSWER"),
  sdp: z.string().optional(),
});

export type PeerAnswerMessage = z.infer<typeof PeerAnswerMessageSchema>;

export const PeerIceCandidateSchema = z.object({
  candidate: z.string().optional(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
});

export const PeerIceMessageSchema = z.object({
  type: z.literal("PEER_ICE"),
  candidate: PeerIceCandidateSchema.nullable(),
});

export type PeerIceMessage = z.infer<typeof PeerIceMessageSchema>;

export const PeerMessageSchema = z.discriminatedUnion("type", [
  PeerOfferMessageSchema,
  PeerAnswerMessageSchema,
  PeerIceMessageSchema,
]);

export type PeerMessage = z.infer<typeof PeerMessageSchema>;
