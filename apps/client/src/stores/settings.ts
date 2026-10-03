import type { ClientName } from "@clipboard-sync/shared/schemas/client";
import type { ServerRoomID } from "@clipboard-sync/shared/schemas/server";
import type { UpdateServerChannel } from "@clipboard-sync/shared/schemas/update-server";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_PING_INTERVAL_MS,
  DEFAULT_POLLING_INTERVAL_MS,
} from "../constants";

export type SettingsStoreActions = {
  reset: () => void;
  update: (settings: Partial<SettingsStoreState>) => void;
};

export type SettingsStoreState = {
  autoConnectOnStart: boolean;
  clientName: ClientName;
  developerMode: boolean;
  minimizeOnClose: boolean;
  minimizeOnStart: boolean;
  notifyOnUpdate: boolean;
  pingInterval: number;
  pollingInterval: number;
  roomId: ServerRoomID;
  saveSecret: boolean;
  serverUrl: string;
  transportMode: SettingsTransportMode;
  updateChannel: UpdateServerChannel;
};

export type SettingsTransportMode = "auto" | "p2p" | "relay";

const initialState: SettingsStoreState = {
  autoConnectOnStart: false,
  clientName: "",
  developerMode: false,
  minimizeOnClose: false,
  minimizeOnStart: false,
  notifyOnUpdate: true,
  pingInterval: DEFAULT_PING_INTERVAL_MS,
  pollingInterval: DEFAULT_POLLING_INTERVAL_MS,
  roomId: "",
  saveSecret: false,
  serverUrl: __DEFAULT_SERVER_URL__,
  transportMode: "auto",
  updateChannel: "release",
};

export const useSettingsStore = create<
  SettingsStoreActions & SettingsStoreState
>()(
  persist(
    (set) => ({
      ...initialState,
      reset: () => set(initialState),
      update: (partial) => set(partial),
    }),
    { name: "clipboard-sync-settings" },
  ),
);
