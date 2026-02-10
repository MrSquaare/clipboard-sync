import { create } from "zustand";

import type { ClipboardUpdateMessage } from "../schemas/clipboard";

export type ClipboardStoreState = {
  lastMessage: ClipboardUpdateMessage | null;
};

export type ClipboardStoreActions = {
  setLastMessage: (lastMessage: ClipboardUpdateMessage) => void;
  reset: () => void;
};

const initialState: ClipboardStoreState = {
  lastMessage: null,
};

export const useClipboardStore = create<
  ClipboardStoreState & ClipboardStoreActions
>((set) => ({
  ...initialState,
  setLastMessage: (lastMessage) => set({ lastMessage }),
  reset: () => set(initialState),
}));
