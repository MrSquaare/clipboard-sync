import z from "zod";
import {
  ClientMessageSchema,
  ServerMessageSchema,
} from "../validation/schemas";

export type PeerId = string;
export type RoomId = string;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
