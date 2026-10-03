import type { LoggerMiddlewareVariables } from "@clipboard-sync/shared/hono/middleware/logger";
import { loggerMiddleware } from "@clipboard-sync/shared/hono/middleware/logger";
import { UpdateServerChannelSchema } from "@clipboard-sync/shared/schemas/update-server";
import { Hono } from "hono";

import { GitHubService } from "../services/github";

export const updateApp = new Hono<{
  Bindings: CloudflareBindings;
  Variables: LoggerMiddlewareVariables;
}>()
  .use("*", loggerMiddleware("Update"))
  .get("/", async (c) => {
    c.var.logger.debug("Update manifest request attempt");

    const rawChannel = c.req.header("X-Update-Channel") ?? "release";
    const channelResult = UpdateServerChannelSchema.safeParse(rawChannel);

    if (!channelResult.success) {
      c.var.logger.warn("Invalid update channel", {
        rawChannel,
        error: channelResult.error,
      });

      return c.text(
        `Invalid channel: '${rawChannel}'. Expected 'release' or 'prerelease'`,
        400,
      );
    }

    const { GITHUB_OWNER, GITHUB_REPO } = c.env;
    const githubService = new GitHubService(GITHUB_OWNER, GITHUB_REPO);
    const channel = channelResult.data;

    try {
      const result = await githubService.resolveUpdateUrl(channel);

      if (!result) {
        c.var.logger.info(`No release found for channel '${channel}'`);

        return c.text(`No release found for channel '${channel}'`, 404);
      }

      c.var.logger.debug(
        `Redirecting to update manifest for ${result.tag} (${channel})`,
      );

      c.header("Cache-Control", "public, max-age=60");

      return c.redirect(result.url, 302);
    } catch (error) {
      c.var.logger.error("Failed to resolve update manifest", { error });

      return c.text("Failed to resolve update manifest", 500);
    }
  });
