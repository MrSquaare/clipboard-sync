import { z } from "zod";

export const ClipboardUpdateMessageSchema = z.object({
  content: z.string(),
  id: z.uuidv4(),
  timestamp: z.number(),
  type: z.literal("CLIPBOARD_UPDATE"),
});

export type ClipboardUpdateMessage = z.infer<
  typeof ClipboardUpdateMessageSchema
>;
