import type { ClientId, ClientName } from "@clipboard-sync/schemas";
import { create } from "zustand";

export type ClientTransportMode = "p2p" | "relay";

export type Client = {
  id: ClientId;
  name: ClientName;
  transport: ClientTransportMode;
};

export type ClientsStoreState = {
  list: Client[];
};

export type ClientStoreActions = {
  getById(clientId: ClientId): Client | undefined;
  add(client: Client): void;
  update(clientId: ClientId, client: Partial<Client>): void;
  remove(clientId: ClientId): void;
  set(clients: Client[]): void;
  reset: () => void;
};

const initialState: ClientsStoreState = {
  list: [],
};

export const useClientsStore = create<ClientsStoreState & ClientStoreActions>(
  (set, get) => ({
    ...initialState,

    getById: (clientId) => {
      return get().list.find((client) => client.id === clientId);
    },

    add: (client) => {
      set((state) => ({
        list: [...state.list, client],
      }));
    },

    update: (clientId, updates) => {
      set((state) => ({
        list: state.list.map((client) =>
          client.id === clientId ? { ...client, ...updates } : client,
        ),
      }));
    },

    remove: (clientId) => {
      set((state) => ({
        list: state.list.filter((client) => client.id !== clientId),
      }));
    },

    set: (clients) => set({ list: clients }),

    reset: () => set(initialState),
  }),
);
