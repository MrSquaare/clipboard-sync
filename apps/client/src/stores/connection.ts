import type { ClientId } from "@clipboard-sync/schemas";
import { create } from "zustand";

export type ConnectionStatus =
  | "connecting"
  | "reconnecting"
  | "connected"
  | "disconnecting"
  | "disconnected";

export type ConnectionStoreState = {
  clientId: ClientId | null;
  status: ConnectionStatus;
  error: string | null;
};

export type ConnectionStoreActions = {
  setClientId: (id: ClientId | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState: ConnectionStoreState = {
  clientId: null,
  status: "disconnected",
  error: null,
};

export const useConnectionStore = create<
  ConnectionStoreState & ConnectionStoreActions
>((set) => ({
  ...initialState,
  setClientId: (clientId) => set({ clientId }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
