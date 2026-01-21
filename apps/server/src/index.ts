import { Hono } from "hono";
import { logger } from "hono/logger";
import { ClipboardRoom } from "./infrastructure/ClipboardRoom";

export { ClipboardRoom };

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use("*", logger());

app.get("/", (c) => c.text("Clipboard Sync Relay Server Active"));

app.get("/ws", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.text("Expected Upgrade: websocket", 426);
  }

  const roomId = c.req.query("roomId");
  if (!roomId) {
    return c.text("Missing roomId", 400);
  }

  // Ensure roomId is safe/valid if needed
  const id = c.env.CLIPBOARD_ROOM.idFromName(roomId);
  const stub = c.env.CLIPBOARD_ROOM.get(id);

  return stub.fetch(c.req.raw);
});

export default app;
