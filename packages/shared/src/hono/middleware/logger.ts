import { createMiddleware } from "hono/factory";

import { Logger, type LogLevel } from "../../utils/logger";

export type LoggerMiddlewareVariables = {
  logger: Logger;
};

export type LoggerMiddlewareBindings = {
  LOG_LEVEL: LogLevel;
};

export const loggerMiddleware = <
  E extends {
    Bindings: LoggerMiddlewareBindings;
    Variables: LoggerMiddlewareVariables;
  } = {
    Bindings: LoggerMiddlewareBindings;
    Variables: LoggerMiddlewareVariables;
  },
>(
  context: string,
) => {
  return createMiddleware<E>((c, next) => {
    if (c.get("logger")) {
      return next();
    }

    const logger = new Logger(c.env.LOG_LEVEL, context);

    c.set("logger", logger);

    return next();
  });
};
