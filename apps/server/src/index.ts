import { ServerRoomIDSchema } from "@clipboard-sync/schemas";
import { Hono } from "hono";
import { logger as httpLogger } from "hono/logger";

import { Room } from "./do/Room";
import { loggerMiddleware } from "./middlewares/logger";

export { Room };

const app = new Hono<{ Bindings: CloudflareBindings }>()
  .use("*", httpLogger())
  .use("*", loggerMiddleware("Router"))
  .get("/", (c) => c.text("Clipboard Sync Signaling and Relay Server"))
  .get("/ws", async (c) => {
    c.var.logger.debug("New WebSocket connection attempt");

    const rawRoomId = c.req.query("roomId");
    const result = ServerRoomIDSchema.safeParse(rawRoomId);

    if (!result.success) {
      c.var.logger.error("Invalid roomId", {
        rawRoomId,
        error: result.error,
      });

      return c.text(result.error.message, 400);
    }

    const roomId = result.data;

    const id = c.env.ROOM.idFromName(roomId);
    const stub = c.env.ROOM.get(id);

    return stub.fetch(c.req.raw);
  });

export default app;
