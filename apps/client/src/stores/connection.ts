import type { ClientId } from "@clipboard-sync/shared/schemas/client";

import { create } from "zustand";

export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "disconnecting"
  | "reconnecting";

export type ConnectionStoreActions = {
  reset: () => void;
  setClientId: (id: ClientId | null) => void;
  setError: (error: null | string) => void;
  setStatus: (status: ConnectionStatus) => void;
};

export type ConnectionStoreState = {
  clientId: ClientId | null;
  error: null | string;
  status: ConnectionStatus;
};

const initialState: ConnectionStoreState = {
  clientId: null,
  error: null,
  status: "disconnected",
};

export const useConnectionStore = create<
  ConnectionStoreActions & ConnectionStoreState
>((set) => ({
  ...initialState,
  reset: () => set(initialState),
  setClientId: (clientId) => set({ clientId }),
  setError: (error) => set({ error }),
  setStatus: (status) => set({ status }),
}));
