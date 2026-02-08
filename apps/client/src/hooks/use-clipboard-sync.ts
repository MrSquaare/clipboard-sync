import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useEffect, useRef, useState } from "react";

import { getErrorMessage, isClipboardEmptyError } from "../errors/helpers";
import { clipboardSyncService } from "../services/clipboard-sync";
import { Logger } from "../services/logger";
import { useConnectionStore } from "../stores/connection";
import { useSettingsStore } from "../stores/settings";

import { useOneTimeEffect } from "./use-one-time-effect";

const logger = new Logger("ClipboardSync");

export const useClipboardSync = () => {
  const { status } = useConnectionStore();
  const { pollingInterval } = useSettingsStore();
  const lastLocal = useRef<string | null>(null);
  const writing = useRef(false);
  const [initialized, setInitialized] = useState(false);

  const initialize = useCallback(async () => {
    try {
      lastLocal.current = await readText();
    } catch (error) {
      if (!isClipboardEmptyError(error)) {
        logger.error(
          `Failed to read clipboard during initialization: ${getErrorMessage(error)}`,
        );
      }
    } finally {
      setInitialized(true);
    }
  }, []);

  useOneTimeEffect(() => {
    initialize();
  });

  const poll = useCallback(async () => {
    try {
      if (writing.current) {
        logger.debug("Skipping clipboard poll while writing content");
        return;
      }

      const content = await readText();

      if (content && content !== lastLocal.current) {
        logger.debug("Local clipboard change detected");

        lastLocal.current = content;

        clipboardSyncService.send(content);
      }
    } catch (error) {
      if (!isClipboardEmptyError(error)) {
        logger.error(`Failed to read clipboard: ${getErrorMessage(error)}`);
      }
    }
  }, []);

  useEffect(() => {
    if (status !== "connected" || !initialized) return;

    logger.info("Sync enabled");

    const unsubscribe = clipboardSyncService.on("update", async (message) => {
      try {
        writing.current = true;

        await writeText(message.content);

        lastLocal.current = message.content;
        writing.current = false;

        logger.debug("Clipboard updated from remote");
      } catch (error) {
        logger.error("Failed to write to clipboard", error);
      }
    });

    const timer = window.setInterval(() => {
      poll();
    }, pollingInterval);

    return () => {
      logger.info("Sync disabled");

      clearInterval(timer);
      unsubscribe();
    };
  }, [status, initialized, pollingInterval, poll]);
};
