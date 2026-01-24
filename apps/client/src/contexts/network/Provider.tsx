import { useEffect, useState } from "react";

import { NetworkService } from "../../services/network";

import { NetworkContext } from "./context";

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [networkService] = useState(() => new NetworkService());

  useEffect(() => {
    return () => {
      networkService.disconnect();
    };
  }, [networkService]);

  return (
    <NetworkContext.Provider value={networkService}>
      {children}
    </NetworkContext.Provider>
  );
}
