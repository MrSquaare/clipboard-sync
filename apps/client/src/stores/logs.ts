import { create } from "zustand";

import type { LogLevel } from "../services/logger";

import { LOGS_MAX_ENTRIES } from "../constants";

export type LogEntry = {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
};

export type LogsStoreActions = {
  clear: () => void;
  log: (level: LogLevel, message: string) => void;
};

export type LogsStoreState = {
  entries: LogEntry[];
};

const initialState: LogsStoreState = {
  entries: [],
};

export const useLogsStore = create<LogsStoreActions & LogsStoreState>(
  (set) => ({
    ...initialState,
    clear: () => set(initialState),
    log: (level, message) =>
      set((state) => {
        const entry: LogEntry = {
          id: crypto.randomUUID(),
          level,
          message,
          timestamp: Date.now(),
        };

        const entries = [entry, ...state.entries].slice(0, LOGS_MAX_ENTRIES);

        return { entries };
      }),
  }),
);
