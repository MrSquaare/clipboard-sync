import { create } from "zustand";

interface ClipboardState {
  lastRemoteClipboard: string | null;
  setLastRemoteClipboard: (content: string) => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  lastRemoteClipboard: null,
  setLastRemoteClipboard: (content) => set({ lastRemoteClipboard: content }),
}));
