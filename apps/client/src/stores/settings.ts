import type { ClientName, ServerRoomID } from "@clipboard-sync/schemas";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SettingsTransportMode = "auto" | "p2p" | "relay";

export type SettingsStoreState = {
  serverUrl: string;
  clientName: ClientName;
  roomId: ServerRoomID;
  transportMode: SettingsTransportMode;
  saveSecret: boolean;
  autoConnectOnStart: boolean;
  minimizeOnClose: boolean;
  minimizeOnStart: boolean;
  pingInterval: number;
  pollingInterval: number;
  developerMode: boolean;
};

export type SettingsStoreActions = {
  update: (settings: Partial<SettingsStoreState>) => void;
  reset: () => void;
};

const initialState: SettingsStoreState = {
  serverUrl: __DEFAULT_SERVER_URL__,
  clientName: "",
  roomId: "",
  transportMode: "auto",
  saveSecret: false,
  autoConnectOnStart: false,
  minimizeOnClose: true,
  minimizeOnStart: false,
  pingInterval: 30000,
  pollingInterval: 1000,
  developerMode: false,
};

export const useSettingsStore = create<
  SettingsStoreState & SettingsStoreActions
>()(
  persist(
    (set) => ({
      ...initialState,
      update: (partial) => set(partial),
      reset: () => set(initialState),
    }),
    { name: "clipboard-sync-settings" },
  ),
);
