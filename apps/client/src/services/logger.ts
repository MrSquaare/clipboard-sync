import {
  debug as tauriDebug,
  error as tauriError,
  info as tauriInfo,
  warn as tauriWarn,
} from "@tauri-apps/plugin-log";

import { getErrorMessage } from "../errors/helpers";
import { useLogsStore } from "../stores/logs";

export type LogLevel = "debug" | "info" | "warn" | "error" | "off";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  off: 4,
};

const parseLogLevel = (level: string): LogLevel => {
  const lower = level.toLowerCase();

  switch (lower) {
    case "debug":
    case "info":
    case "warn":
    case "error":
    case "off":
      return lower as LogLevel;
    default:
      console.warn(`Invalid log level '${level}', defaulting to 'info'`);
      return "info";
  }
};

const MIN_PRIORITY = LOG_LEVEL_PRIORITY[parseLogLevel(__LOG_LEVEL__)];

export class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  log(level: LogLevel, message: string): void {
    if (level === "off") {
      return;
    }

    if (LOG_LEVEL_PRIORITY[level] < MIN_PRIORITY) {
      return;
    }

    const formatted = `[${this.context}] ${message}`;

    switch (level) {
      case "debug":
        tauriDebug(formatted).catch(() => {});
        break;
      case "info":
        tauriInfo(formatted).catch(() => {});
        break;
      case "warn":
        tauriWarn(formatted).catch(() => {});
        break;
      case "error":
        tauriError(formatted).catch(() => {});
        break;
    }

    this.logsStore.log(level, formatted);
  }

  debug(message: string): void {
    this.log("debug", message);
  }

  info(message: string): void {
    this.log("info", message);
  }

  warn(message: string): void {
    this.log("warn", message);
  }

  error(message: string, error?: unknown): void {
    const errorMessage = error ? getErrorMessage(error) : undefined;
    const fullMessage = errorMessage ? `${message}: ${errorMessage}` : message;

    this.log("error", fullMessage);
  }

  private get logsStore() {
    return useLogsStore.getState();
  }
}
