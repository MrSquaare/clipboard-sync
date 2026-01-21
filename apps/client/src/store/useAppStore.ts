import { create } from "zustand";
import { PeerId } from "../types/protocol";

export type PeerStatus = "connected" | "connecting" | "disconnected";
export type PeerType = "p2p" | "relay";

export interface Peer {
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
  peers: Peer[];
  logs: LogEntry[];

  setConnectionStatus: (status: AppState["connectionStatus"]) => void;
  setMyId: (id: PeerId) => void;
  addPeer: (id: PeerId) => void;
  updatePeer: (id: PeerId, update: Partial<Peer>) => void;
  removePeer: (id: PeerId) => void;
  addLog: (message: string, type?: LogEntry["type"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  connectionStatus: "disconnected",
  myId: null,
  peers: [],
  logs: [],

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setMyId: (myId) => set({ myId }),

  addPeer: (id) =>
    set((state) => {
      if (state.peers.some((p) => p.id === id)) return state;
      return {
        peers: [...state.peers, { id, status: "disconnected", type: "relay" }],
      };
    }),

  updatePeer: (id, update) =>
    set((state) => ({
      peers: state.peers.map((p) => (p.id === id ? { ...p, ...update } : p)),
    })),

  removePeer: (id) =>
    set((state) => ({
      peers: state.peers.filter((p) => p.id !== id),
    })),

  addLog: (message, type = "info") =>
    set((state) => ({
      logs: [
        { id: crypto.randomUUID(), timestamp: Date.now(), message, type },
        ...state.logs.slice(0, 99),
      ],
    })),
}));
