import { create } from "zustand";

import { LOGS_MAX_ENTRIES } from "../constants";
import type { LogLevel } from "../services/logger";

export type LogEntry = {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
};

export type LogsStoreState = {
  entries: LogEntry[];
};

export type LogsStoreActions = {
  log: (level: LogLevel, message: string) => void;
  clear: () => void;
};

const initialState: LogsStoreState = {
  entries: [],
};

export const useLogsStore = create<LogsStoreState & LogsStoreActions>(
  (set) => ({
    ...initialState,
    log: (level, message) =>
      set((state) => {
        const entry: LogEntry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          level,
          message,
        };

        const entries = [entry, ...state.entries].slice(0, LOGS_MAX_ENTRIES);

        return { entries };
      }),
    clear: () => set(initialState),
  }),
);
