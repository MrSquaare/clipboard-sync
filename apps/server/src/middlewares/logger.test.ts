import { Hono } from "hono";
import { describe, expect, it, vi, afterEach } from "vitest";

import type { Logger } from "../utils/logger";
import { MockedLogger } from "../utils/logger.mock";

import { loggerMiddleware } from "./logger";

describe("loggerMiddleware", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should set logger in context if missing", async () => {
    let logger: Logger | undefined;
    const app = new Hono()
      .use("*", loggerMiddleware("TestContext"))
      .get("/test", (c) => {
        logger = c.get("logger");

        return c.text("OK");
      });

    await app.request("/test", {}, { LOG_LEVEL: "info" });

    expect(logger).toEqual(MockedLogger.mock.instances[0]);
    expect(MockedLogger).toHaveBeenCalledTimes(1);
    expect(MockedLogger).toHaveBeenCalledWith("info", "TestContext");
  });

  it("should keep existing logger in context if already exists", async () => {
    let logger: Logger | undefined;
    const existingLogger = new MockedLogger("debug", "ExistingContext");
    const app = new Hono<{ Variables: { logger: Logger } }>()
      .use("*", async (c, next) => {
        c.set("logger", existingLogger);

        await next();
      })
      .use("*", loggerMiddleware("NewContext"))
      .get("/test", (c) => {
        logger = c.get("logger");

        return c.text("OK");
      });

    await app.request("/test", {}, { LOG_LEVEL: "info" });

    expect(logger).toEqual(existingLogger);
    expect(MockedLogger).toHaveBeenCalledTimes(1);
  });
});
