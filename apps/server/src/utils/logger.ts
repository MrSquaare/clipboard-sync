export type LogLevel = "debug" | "info" | "warn" | "error";

export class Logger {
  private level: number;

  private static LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(level: string = "info") {
    this.level = Logger.LEVELS[level as LogLevel] ?? Logger.LEVELS.info;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ) {
    // Cloudflare Workers console already includes timestamps, but we keep the format consistent
    const timestamp = new Date().toISOString();
    const metaStr =
      meta && Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (Logger.LEVELS.debug >= this.level) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    if (Logger.LEVELS.info >= this.level) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (Logger.LEVELS.warn >= this.level) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>) {
    if (Logger.LEVELS.error >= this.level) {
      console.error(this.formatMessage("error", message, meta));
    }
  }
}
