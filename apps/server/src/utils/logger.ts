// A lightweight logger for Cloudflare Workers (Edge Runtime)
// Replaces winston which depends on Node.js 'os'/'https' modules.

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Default to 'info' if not specified
const CURRENT_LEVEL_STR = (typeof process !== "undefined" && process.env?.LOG_LEVEL) || "info";
const CURRENT_LEVEL = LEVELS[CURRENT_LEVEL_STR as LogLevel] ?? LEVELS.info;

const formatMessage = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length ? JSON.stringify(meta) : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (LEVELS.debug >= CURRENT_LEVEL) {
      console.debug(formatMessage("debug", message, meta));
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (LEVELS.info >= CURRENT_LEVEL) {
      console.info(formatMessage("info", message, meta));
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (LEVELS.warn >= CURRENT_LEVEL) {
      console.warn(formatMessage("warn", message, meta));
    }
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (LEVELS.error >= CURRENT_LEVEL) {
      console.error(formatMessage("error", message, meta));
    }
  },
};