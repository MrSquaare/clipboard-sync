export type LogLevel = "debug" | "info" | "warn" | "error";

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: number;
  private context: string;

  constructor(level: LogLevel, context: string) {
    this.level = LOG_LEVEL_PRIORITY[level];
    this.context = context;
  }

  private format(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ) {
    const timestamp = new Date().toISOString();
    const context = this.context;
    const metaStr = meta ? JSON.stringify(meta) : "";

    return `[${timestamp}] [${context}] ${level.toUpperCase()}: ${message} ${metaStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (LOG_LEVEL_PRIORITY.debug >= this.level) {
      console.debug(this.format("debug", message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (LOG_LEVEL_PRIORITY.info >= this.level) {
      console.info(this.format("info", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (LOG_LEVEL_PRIORITY.warn >= this.level) {
      console.warn(this.format("warn", message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>) {
    if (LOG_LEVEL_PRIORITY.error >= this.level) {
      console.error(this.format("error", message, meta));
    }
  }
}
