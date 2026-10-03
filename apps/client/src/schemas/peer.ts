import { z } from "zod";

export const PeerOfferMessageSchema = z.object({
  sdp: z.string().optional(),
  type: z.literal("PEER_OFFER"),
});

export type PeerOfferMessage = z.infer<typeof PeerOfferMessageSchema>;

export const PeerAnswerMessageSchema = z.object({
  sdp: z.string().optional(),
  type: z.literal("PEER_ANSWER"),
});

export type PeerAnswerMessage = z.infer<typeof PeerAnswerMessageSchema>;

export const PeerIceCandidateSchema = z.object({
  candidate: z.string().optional(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
});

export const PeerIceMessageSchema = z.object({
  candidate: PeerIceCandidateSchema.nullable(),
  type: z.literal("PEER_ICE"),
});

export type PeerIceMessage = z.infer<typeof PeerIceMessageSchema>;

export const PeerMessageSchema = z.discriminatedUnion("type", [
  PeerOfferMessageSchema,
  PeerAnswerMessageSchema,
  PeerIceMessageSchema,
]);

export type PeerMessage = z.infer<typeof PeerMessageSchema>;
