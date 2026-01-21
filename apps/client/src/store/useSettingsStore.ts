import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TransportMode = "auto" | "p2p" | "relay";

interface SettingsState {
  serverUrl: string;
  roomId: string;
  // We don't persist the secret for security, or we could encrypted?
  // For now, user re-enters or we store in session.
  // Actually, for UX, let's keep it in memory only in the App scope, not persisted.
  transportMode: TransportMode;

  setServerUrl: (url: string) => void;
  setRoomId: (id: string) => void;
  setTransportMode: (mode: TransportMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: "ws://localhost:8787",
      roomId: "",
      transportMode: "auto",

      setServerUrl: (serverUrl) => set({ serverUrl }),
      setRoomId: (roomId) => set({ roomId }),
      setTransportMode: (transportMode) => set({ transportMode }),
    }),
    {
      name: "clipboard-sync-settings",
    },
  ),
);
