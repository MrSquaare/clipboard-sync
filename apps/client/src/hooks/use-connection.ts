import { useCallback } from "react";

import {
  getErrorMessage,
  isSecureStorageMissingEntryError,
} from "../errors/helpers";
import { clientsService } from "../services/clients";
import { clipboardSyncService } from "../services/clipboard-sync";
import { connectionService } from "../services/connection";
import { secretService } from "../services/secret";
import { transportService } from "../services/transport";
import { useConnectionStore } from "../stores/connection";

export type ConnectWithSavedOptions = {
  saveSecret: boolean;
};

export type ConnectOptions = {
  secret: string;
  saveSecret: boolean;
};

export const useConnection = () => {
  const { setStatus, setError } = useConnectionStore();

  const connect = useCallback(
    async (options: ConnectOptions) => {
      setStatus("connecting");
      setError(null);

      try {
        await secretService.setSecret(options.secret);

        if (options.saveSecret) {
          await secretService.saveSecret(options.secret);
        }

        connectionService.connect();
      } catch (error) {
        setStatus("disconnected");
        setError(getErrorMessage(error));
      }
    },
    [setStatus, setError],
  );

  const disconnect = useCallback(async () => {
    setStatus("disconnecting");
    setError(null);

    try {
      connectionService.disconnect();
      transportService.disconnectAll();
      clientsService.reset();
      clipboardSyncService.reset();
      await secretService.unsetSecret();
      await secretService.clearSecret();
    } catch (error) {
      if (!isSecureStorageMissingEntryError(error)) {
        setError(getErrorMessage(error));
      }
    } finally {
      setStatus("disconnected");
    }
  }, [setStatus, setError]);

  return { connect, disconnect };
};
