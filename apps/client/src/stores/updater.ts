import type { Update } from "@tauri-apps/plugin-updater";

import { create } from "zustand";

export type UpdaterStatus =
  | "available"
  | "checking"
  | "downloading"
  | "error"
  | "idle"
  | "ready"
  | "up-to-date";

export type UpdaterStoreActions = {
  reset: () => void;
  setDismissed: (dismissed: boolean) => void;
  setError: (error: null | string) => void;
  setProgress: (progress: {
    downloadedBytes: number;
    downloadProgress: number;
    totalBytes: number;
  }) => void;
  setStatus: (status: UpdaterStatus) => void;
  setUpdate: (update: null | Update) => void;
};

export type UpdaterStoreState = {
  dismissed: boolean;
  downloadedBytes: number;
  downloadProgress: number;
  error: null | string;
  status: UpdaterStatus;
  totalBytes: number;
  update: null | Update;
};

const initialState: UpdaterStoreState = {
  dismissed: false,
  downloadedBytes: 0,
  downloadProgress: 0,
  error: null,
  status: "idle",
  totalBytes: 0,
  update: null,
};

export const useUpdaterStore = create<
  UpdaterStoreActions & UpdaterStoreState
>()((set) => ({
  ...initialState,
  reset: () => set(initialState),
  setDismissed: (dismissed) => set({ dismissed }),
  setError: (error) => set({ error }),
  setProgress: ({ downloadedBytes, downloadProgress, totalBytes }) =>
    set({ downloadedBytes, downloadProgress, totalBytes }),
  setStatus: (status) => set({ status }),
  setUpdate: (update) => set({ update }),
}));
