import { ClientNameSchema, ServerRoomIDSchema } from "@clipboard-sync/schemas";
import { z } from "zod";

export const ConnectionFormSchema = z.object({
  clientName: ClientNameSchema,
  roomId: ServerRoomIDSchema,
  secret: z.string().min(6, "Secret must be at least 6 characters"),
  saveSecret: z.boolean(),
  autoConnectOnStart: z.boolean(),
});

export type ConnectionFormValues = z.infer<typeof ConnectionFormSchema>;
