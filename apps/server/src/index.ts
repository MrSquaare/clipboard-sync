import { Hono } from "hono";
import { logger } from "hono/logger";

import { Room } from "./do/Room";

export { Room };

const app = new Hono<{ Bindings: CloudflareBindings }>()
  .use("*", logger())
  .get("/", (c) => c.text("Clipboard Sync Signaling and Relay Server"))
  .get("/ws", async (c) => {
    const roomId = c.req.query("roomId");

    if (!roomId) {
      return c.text("Missing roomId", 400);
    }

    const id = c.env.ROOM.idFromName(roomId);
    const stub = c.env.ROOM.get(id);

    return stub.fetch(c.req.raw);
  });

export default app;
