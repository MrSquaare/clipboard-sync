import { create } from "zustand";
import { PeerId } from "../types/protocol";

export type PeerStatus = "connected" | "connecting" | "disconnected";
export type PeerType = "p2p" | "relay";

export interface Client {
  id: PeerId;
  status: PeerStatus;
  type: PeerType;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "error" | "success";
}

interface AppState {
  connectionStatus: "disconnected" | "connecting" | "connected";
  myId: PeerId | null;
  clients: Client[];
  logs: LogEntry[];

  setConnectionStatus: (status: AppState["connectionStatus"]) => void;
  setMyId: (id: PeerId) => void;
  addClient: (id: PeerId) => void;
  updateClient: (id: PeerId, update: Partial<Client>) => void;
  removeClient: (id: PeerId) => void;
  clearClients: () => void;
  addLog: (message: string, type?: LogEntry["type"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  connectionStatus: "disconnected",
  myId: null,
  clients: [],
  logs: [],

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setMyId: (myId) => set({ myId }),
  clearClients: () => set({ clients: [] }),

  addClient: (id) =>
    set((state) => {
      if (state.clients.some((p) => p.id === id)) return state;
      return {
        clients: [
          ...state.clients,
          { id, status: "disconnected", type: "relay" },
        ],
      };
    }),

  updateClient: (id, update) =>
    set((state) => ({
      clients: state.clients.map((p) =>
        p.id === id ? { ...p, ...update } : p,
      ),
    })),

  removeClient: (id) =>
    set((state) => ({
      clients: state.clients.filter((p) => p.id !== id),
    })),

  addLog: (message, type = "info") =>
    set((state) => ({
      logs: [
        { id: crypto.randomUUID(), timestamp: Date.now(), message, type },
        ...state.logs.slice(0, 99),
      ],
    })),
}));
