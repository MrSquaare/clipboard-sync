import { create } from "zustand";

import type { ClipboardUpdateMessage } from "../schemas/clipboard";

export type ClipboardStoreActions = {
  reset: () => void;
  setLastMessage: (lastMessage: ClipboardUpdateMessage) => void;
};

export type ClipboardStoreState = {
  lastMessage: ClipboardUpdateMessage | null;
};

const initialState: ClipboardStoreState = {
  lastMessage: null,
};

export const useClipboardStore = create<
  ClipboardStoreActions & ClipboardStoreState
>((set) => ({
  ...initialState,
  reset: () => set(initialState),
  setLastMessage: (lastMessage) => set({ lastMessage }),
}));
