import { create } from "zustand";

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "error" | "success";
}

interface LogState {
  logs: LogEntry[];
  addLog: (message: string, type?: LogEntry["type"]) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],

  addLog: (message, type = "info") =>
    set((state) => ({
      logs: [
        { id: crypto.randomUUID(), timestamp: Date.now(), message, type },
        ...state.logs.slice(0, 99),
      ],
    })),

  clearLogs: () => set({ logs: [] }),
}));
