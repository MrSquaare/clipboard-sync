import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { Logger } from "./logger";

const logger = new Logger("Window");

export class WindowService {
  async minimizeWindow(): Promise<void> {
    try {
      await invoke("minimize_window");
    } catch (error) {
      logger.error("Failed to minimize window", error);
    }
  }

  onCloseRequested(handler: () => Promise<void> | void): () => void {
    let unlisten: (() => void) | null = null;
    let shouldCleanup = false;

    listen("close-requested", async () => {
      try {
        await handler();
      } catch (error) {
        logger.error("Error in close request handler", error);
      }
    })
      .then((unlistenFn) => {
        if (shouldCleanup) {
          unlistenFn();
        } else {
          unlisten = unlistenFn;
        }
      })
      .catch((error) => {
        logger.error("Failed to setup close request listener", error);
      });

    return () => {
      if (unlisten) {
        unlisten();
      } else {
        shouldCleanup = true;
      }
    };
  }

  async quitApp(): Promise<void> {
    try {
      await invoke("quit_app");
    } catch (error) {
      logger.error("Failed to quit app", error);
    }
  }

  async showWindow(): Promise<void> {
    try {
      await invoke("show_window");
    } catch (error) {
      logger.error("Failed to show window", error);
    }
  }
}

export const windowService = new WindowService();
