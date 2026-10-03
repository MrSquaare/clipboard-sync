import {
  debug as tauriDebug,
  error as tauriError,
  info as tauriInfo,
  warn as tauriWarn,
} from "@tauri-apps/plugin-log";

import { getErrorMessage } from "../errors/helpers";
import { useLogsStore } from "../stores/logs";

export type LogLevel = "debug" | "error" | "info" | "off" | "warn";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  error: 3,
  info: 1,
  off: 4,
  warn: 2,
};

const parseLogLevel = (level: string): LogLevel => {
  const lower = level.toLowerCase();

  switch (lower) {
    case "debug":
    case "error":
    case "info":
    case "off":
    case "warn":
      return lower as LogLevel;
    default:
      console.warn(`Invalid log level '${level}', defaulting to 'info'`);

      return "info";
  }
};

const MIN_PRIORITY = LOG_LEVEL_PRIORITY[parseLogLevel(__LOG_LEVEL__)];

export class Logger {
  private readonly context: string;

  private get logsStore() {
    return useLogsStore.getState();
  }

  constructor(context: string) {
    this.context = context;
  }

  debug(message: string): void {
    this.log("debug", message);
  }

  error(message: string, error?: unknown): void {
    const errorMessage = error ? getErrorMessage(error) : undefined;
    const fullMessage = errorMessage ? `${message}: ${errorMessage}` : message;

    this.log("error", fullMessage);
  }

  info(message: string): void {
    this.log("info", message);
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
      case "error":
        tauriError(formatted).catch(() => {});

        break;
      case "info":
        tauriInfo(formatted).catch(() => {});

        break;
      case "warn":
        tauriWarn(formatted).catch(() => {});

        break;
    }

    this.logsStore.log(level, formatted);
  }

  warn(message: string): void {
    this.log("warn", message);
  }
}
