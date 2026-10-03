import { UpdateServerChannelSchema } from "@clipboard-sync/shared/schemas/update-server";
import { z } from "zod";

export const SettingsFormSchema = z.object({
  developerMode: z.boolean(),
  launchOnStart: z.boolean(),
  minimizeOnClose: z.boolean(),
  minimizeOnStart: z.boolean(),
  notifyOnUpdate: z.boolean(),
  pingInterval: z
    .number()
    .min(10000, "Ping interval must be at least 10 seconds (10000 ms)"),
  pollingInterval: z
    .number()
    .min(100, "Polling interval must be at least 100 ms"),
  serverUrl: z.url({
    message: "Server URL must be a valid URL starting with ws:// or wss://",
    protocol: /^(ws|wss)$/,
  }),
  transportMode: z.enum(["auto", "p2p", "relay"]),
  updateChannel: UpdateServerChannelSchema,
});

export type SettingsFormValues = z.infer<typeof SettingsFormSchema>;
