import { z } from "zod";

export const ClipboardUpdateMessageSchema = z.object({
  type: z.literal("CLIPBOARD_UPDATE"),
  id: z.uuidv4(),
  timestamp: z.number(),
  content: z.string(),
});

export type ClipboardUpdateMessage = z.infer<
  typeof ClipboardUpdateMessageSchema
>;
