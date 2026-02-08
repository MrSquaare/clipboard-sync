import { useCallback } from "react";

import { Logger } from "../services/logger";
import { secretService } from "../services/secret";
import { useConnectionStore } from "../stores/connection";
import { useSettingsStore } from "../stores/settings";

import { useConnection } from "./use-connection";
import { useOneTimeEffect } from "./use-one-time-effect";

const logger = new Logger("AutoConnection");

export function useAutoConnect(): void {
  const { status } = useConnectionStore();
  const { autoConnectOnStart } = useSettingsStore();
  const { connect } = useConnection();

  const autoConnect = useCallback(async () => {
    try {
      logger.debug("Starting");

      const secret = await secretService.loadSecret();

      if (!secret) {
        logger.debug("Skipped: no saved secret found");
        return;
      }

      await connect({ secret, saveSecret: false });
    } catch (error) {
      logger.error("Failed", error);
    }
  }, [connect]);

  useOneTimeEffect(() => {
    if (status !== "disconnected" || !autoConnectOnStart) return;

    autoConnect();
  });
}
