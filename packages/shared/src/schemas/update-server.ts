import { z } from "zod";

export const UpdateServerChannelSchema = z.enum(["release", "prerelease"]);

export type UpdateServerChannel = z.infer<typeof UpdateServerChannelSchema>;
