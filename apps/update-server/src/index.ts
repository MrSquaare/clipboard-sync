import { Hono } from "hono";
import { logger as httpLogger } from "hono/logger";

import { updateApp } from "./routes/update";

const app = new Hono<{ Bindings: CloudflareBindings }>()
  .use("*", httpLogger())
  .route("/", updateApp);

export default app;
