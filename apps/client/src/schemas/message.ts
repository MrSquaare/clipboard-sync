import { z } from "zod";

import { ClipboardUpdateMessageSchema } from "./clipboard";
import { PeerMessageSchema } from "./peer";

export const MessageSchema = z.discriminatedUnion("type", [
  ...PeerMessageSchema.options,
  ClipboardUpdateMessageSchema,
]);

export type Message = z.infer<typeof MessageSchema>;
