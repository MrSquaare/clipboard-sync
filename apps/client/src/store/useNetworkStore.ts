import type { PeerId } from "@clipboard-sync/schemas";
import { create } from "zustand";

import type { ConnectionStatus } from "../services/transport";

interface NetworkState {
  connectionStatus: ConnectionStatus;
  myId: PeerId | null;

  setConnectionStatus: (status: NetworkState["connectionStatus"]) => void;
  setMyId: (id: PeerId | null) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  connectionStatus: "disconnected",
  myId: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setMyId: (myId) => set({ myId }),
}));
