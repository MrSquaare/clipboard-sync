import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TransportMode = "auto" | "p2p" | "relay";

interface SettingsState {
  serverUrl: string;
  roomId: string;
  transportMode: TransportMode;
  pollingInterval: number;
  pingInterval: number;
  developerMode: boolean;

  setServerUrl: (url: string) => void;
  setRoomId: (id: string) => void;
  setTransportMode: (mode: TransportMode) => void;
  setPollingInterval: (ms: number) => void;
  setPingInterval: (ms: number) => void;
  setDeveloperMode: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: __DEFAULT_SERVER_URL__,
      roomId: "",
      transportMode: "auto",
      pollingInterval: 1000,
      pingInterval: 30000,
      developerMode: false,

      setServerUrl: (serverUrl) => set({ serverUrl }),
      setRoomId: (roomId) => set({ roomId }),
      setTransportMode: (transportMode) => set({ transportMode }),
      setPollingInterval: (pollingInterval) => set({ pollingInterval }),
      setPingInterval: (pingInterval) => set({ pingInterval }),
      setDeveloperMode: (developerMode) => set({ developerMode }),
    }),
    {
      name: "clipboard-sync-settings",
    },
  ),
);
