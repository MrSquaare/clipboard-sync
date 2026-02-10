import { z } from "zod";

export const SettingsFormSchema = z.object({
  serverUrl: z.url({
    protocol: /^(ws|wss)$/,
    message: "Server URL must be a valid URL starting with ws:// or wss://",
  }),
  transportMode: z.enum(["auto", "p2p", "relay"]),
  pingInterval: z
    .number()
    .min(10000, "Ping interval must be at least 10 seconds (10000 ms)"),
  pollingInterval: z
    .number()
    .min(100, "Polling interval must be at least 100 ms"),
  launchOnStart: z.boolean(),
  minimizeOnClose: z.boolean(),
  minimizeOnStart: z.boolean(),
  developerMode: z.boolean(),
});

export type SettingsFormValues = z.infer<typeof SettingsFormSchema>;
