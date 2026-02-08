import { createMiddleware } from "hono/factory";

import { Logger } from "../utils/logger";

export type LoggerMiddlewareVariables = {
  logger: Logger;
};

export const loggerMiddleware = (context: string) => {
  return createMiddleware<{
    Bindings: CloudflareBindings;
    Variables: LoggerMiddlewareVariables;
  }>((c, next) => {
    if (c.get("logger")) {
      return next();
    }

    const logger = new Logger(c.env.LOG_LEVEL, context);

    c.set("logger", logger);

    return next();
  });
};
