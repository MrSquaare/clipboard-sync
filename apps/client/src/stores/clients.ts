import { create } from "zustand";

export type ClientTransportType = "p2p" | "relay";

export type Client = {
  id: string;
  name: string;
  transport: ClientTransportType;
};

export type ClientsStoreState = {
  list: Client[];
};

export type ClientStoreActions = {
  getById(clientId: string): Client | undefined;
  add(client: Client): void;
  update(clientId: string, client: Partial<Client>): void;
  remove(clientId: string): void;
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
