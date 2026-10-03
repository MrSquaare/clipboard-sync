import { useEffect } from "react";

import { AUTO_UPDATER_INITIAL_CHECK_DELAY_MS } from "../constants";
import { updaterService } from "../services/updater";
import { useSettingsStore } from "../stores/settings";

export const useAutoUpdater = (): void => {
  const { notifyOnUpdate } = useSettingsStore();

  useEffect(() => {
    if (!notifyOnUpdate) {
      return;
    }

    const timer = setTimeout(() => {
      updaterService.check(false);
    }, AUTO_UPDATER_INITIAL_CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [notifyOnUpdate]);
};
