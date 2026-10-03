import type {
  ClientId,
  ClientName,
} from "@clipboard-sync/shared/schemas/client";

import { create } from "zustand";

export type Client = {
  id: ClientId;
  name: ClientName;
  transport: ClientTransportMode;
};

export type ClientsStoreState = {
  list: Client[];
};

export type ClientStoreActions = {
  add(client: Client): void;
  getById(clientId: ClientId): Client | undefined;
  remove(clientId: ClientId): void;
  reset: () => void;
  set(clients: Client[]): void;
  update(clientId: ClientId, client: Partial<Client>): void;
};

export type ClientTransportMode = "p2p" | "relay";

const initialState: ClientsStoreState = {
  list: [],
};

export const useClientsStore = create<ClientsStoreState & ClientStoreActions>(
  (set, get) => ({
    ...initialState,

    add: (client) => {
      set((state) => ({
        list: [...state.list, client],
      }));
    },

    getById: (clientId) => {
      return get().list.find((client) => client.id === clientId);
    },

    remove: (clientId) => {
      set((state) => ({
        list: state.list.filter((client) => client.id !== clientId),
      }));
    },

    reset: () => set(initialState),

    set: (clients) => set({ list: clients }),

    update: (clientId, updates) => {
      set((state) => ({
        list: state.list.map((client) =>
          client.id === clientId ? { ...client, ...updates } : client,
        ),
      }));
    },
  }),
);
