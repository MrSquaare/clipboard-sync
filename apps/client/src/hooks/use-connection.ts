import { useCallback } from "react";

import { clientsService } from "../services/clients";
import { clipboardSyncService } from "../services/clipboard-sync";
import { connectionService } from "../services/connection";
import { secretService } from "../services/secret";
import { transportService } from "../services/transport";

export type ConnectWithSavedOptions = {
  saveSecret: boolean;
};

export type ConnectOptions = {
  secret: string;
  saveSecret: boolean;
};

export const useConnection = () => {
  const connect = useCallback(async (options: ConnectOptions) => {
    await secretService.setSecret(options.secret);

    if (options.saveSecret) {
      await secretService.saveSecret(options.secret);
    }

    connectionService.connect();
  }, []);

  const disconnect = useCallback(async () => {
    connectionService.disconnect();
    transportService.disconnectAll();
    clientsService.reset();
    clipboardSyncService.reset();
    await secretService.unsetSecret();
    await secretService.clearSecret();
  }, []);

  return { connect, disconnect };
};
