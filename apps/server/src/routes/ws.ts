import type { LoggerMiddlewareVariables } from "@clipboard-sync/shared/hono/middleware/logger";

import { loggerMiddleware } from "@clipboard-sync/shared/hono/middleware/logger";
import { ServerRoomIDSchema } from "@clipboard-sync/shared/schemas/server";
import { Hono } from "hono";

export const wsApp = new Hono<{
  Bindings: CloudflareBindings;
  Variables: LoggerMiddlewareVariables;
}>()
  .use("*", loggerMiddleware("WS"))
  .get("/", async (c) => {
    c.var.logger.debug("New WebSocket connection attempt");

    const rawRoomId = c.req.query("roomId");
    const result = ServerRoomIDSchema.safeParse(rawRoomId);

    if (!result.success) {
      c.var.logger.error("Invalid roomId", {
        error: result.error,
        rawRoomId,
      });

      return c.text(result.error.message, 400);
    }

    const roomId = result.data;

    const id = c.env.ROOM.idFromName(roomId);
    const stub = c.env.ROOM.get(id);

    return stub.fetch(c.req.raw);
  });
