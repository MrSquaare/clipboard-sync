import { ClientNameSchema } from "@clipboard-sync/shared/schemas/client";
import { ServerRoomIDSchema } from "@clipboard-sync/shared/schemas/server";
import { z } from "zod";

export const ConnectionFormSchema = z.object({
  autoConnectOnStart: z.boolean(),
  clientName: ClientNameSchema,
  roomId: ServerRoomIDSchema,
  saveSecret: z.boolean(),
  secret: z.string().min(6, "Secret must be at least 6 characters"),
});

export type ConnectionFormValues = z.infer<typeof ConnectionFormSchema>;
