import { useEffect } from "react";

import { windowService } from "../services/window";
import { useSettingsStore } from "../stores/settings";

import { useOneTimeEffect } from "./use-one-time-effect";

export const useWindowBehavior = () => {
  const { minimizeOnStart, minimizeOnClose } = useSettingsStore();

  useOneTimeEffect(() => {
    if (!minimizeOnStart) {
      windowService.showWindow();
    }
  });

  useEffect(() => {
    const unsubscribe = windowService.onCloseRequested(async () => {
      if (minimizeOnClose) {
        await windowService.minimizeWindow();
      } else {
        await windowService.quitApp();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [minimizeOnClose]);
};
