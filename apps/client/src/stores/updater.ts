import type { Update } from "@tauri-apps/plugin-updater";
import { create } from "zustand";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "up-to-date"
  | "error";

export type UpdaterStoreState = {
  status: UpdaterStatus;
  update: Update | null;
  downloadProgress: number;
  downloadedBytes: number;
  totalBytes: number;
  error: string | null;
  dismissed: boolean;
};

export type UpdaterStoreActions = {
  setStatus: (status: UpdaterStatus) => void;
  setUpdate: (update: Update | null) => void;
  setProgress: (progress: {
    downloadProgress: number;
    downloadedBytes: number;
    totalBytes: number;
  }) => void;
  setError: (error: string | null) => void;
  setDismissed: (dismissed: boolean) => void;
  reset: () => void;
};

const initialState: UpdaterStoreState = {
  status: "idle",
  update: null,
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  error: null,
  dismissed: false,
};

export const useUpdaterStore = create<
  UpdaterStoreState & UpdaterStoreActions
>()((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setUpdate: (update) => set({ update }),
  setProgress: ({ downloadProgress, downloadedBytes, totalBytes }) =>
    set({ downloadProgress, downloadedBytes, totalBytes }),
  setError: (error) => set({ error }),
  setDismissed: (dismissed) => set({ dismissed }),
  reset: () => set(initialState),
}));
