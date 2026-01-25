import type { PeerId } from "@clipboard-sync/schemas";
import { create } from "zustand";

export type PeerStatus = "connected" | "connecting" | "disconnected";
export type PeerType = "p2p" | "relay";

export interface Client {
  id: PeerId;
  status: PeerStatus;
  type: PeerType;
}

interface ClientState {
  clients: Client[];

  addClient: (id: PeerId) => void;
  updateClient: (id: PeerId, update: Partial<Client>) => void;
  removeClient: (id: PeerId) => void;
  clearClients: () => void;
}

export const useClientStore = create<ClientState>((set) => ({
  clients: [],

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

  clearClients: () => set({ clients: [] }),
}));
