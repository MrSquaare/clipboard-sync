import { loggerMiddleware } from "@clipboard-sync/shared/hono/middleware/logger";
import { Hono } from "hono";
import { logger as httpLogger } from "hono/logger";

import { Room } from "./do/Room";
import { wsApp } from "./routes/ws";

export { Room };

const app = new Hono<{ Bindings: CloudflareBindings }>()
  .use("*", httpLogger())
  .use("*", loggerMiddleware("Router"))
  .get("/", (c) => c.text("Clipboard Sync Signaling and Relay Server"))
  .route("/ws", wsApp);

export default app;
