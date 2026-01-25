import { createContext } from "react";

import type { NetworkService } from "../../services/network";

export const NetworkContext = createContext<NetworkService | null>(null);
