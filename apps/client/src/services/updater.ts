import type { Update } from "@tauri-apps/plugin-updater";

import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

import { useSettingsStore } from "../stores/settings";
import { useUpdaterStore } from "../stores/updater";
import { Logger } from "./logger";

const logger = new Logger("Updater");

export class UpdaterService {
  async check(manual = false): Promise<null | Update> {
    const { updateChannel } = useSettingsStore.getState();
    const updaterStore = useUpdaterStore.getState();

    updaterStore.setStatus("checking");
    updaterStore.setError(null);

    try {
      logger.debug(`Checking for updates (channel: ${updateChannel})`);

      const update = await check({
        headers: {
          "X-Update-Channel": updateChannel,
        },
      });

      if (update) {
        logger.info(`Update available: ${update.version}`);
        updaterStore.setUpdate(update);
        updaterStore.setStatus("available");
        updaterStore.setDismissed(false);
      } else {
        logger.debug("No update available");
        updaterStore.setUpdate(null);
        updaterStore.setStatus(manual ? "up-to-date" : "idle");
      }

      return update;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to check for updates";

      logger.error("Failed to check for updates", error);
      updaterStore.setError(message);
      updaterStore.setStatus("error");

      return null;
    }
  }

  dismiss(): void {
    useUpdaterStore.getState().setDismissed(true);
  }

  async downloadAndInstall(): Promise<void> {
    const { update } = useUpdaterStore.getState();

    if (!update) {
      return;
    }

    const updaterStore = useUpdaterStore.getState();

    updaterStore.setStatus("downloading");
    updaterStore.setError(null);
    updaterStore.setProgress({
      downloadedBytes: 0,
      downloadProgress: 0,
      totalBytes: 0,
    });

    let totalBytes = 0;
    let downloadedBytes = 0;

    try {
      logger.info(`Downloading and installing update: ${update.version}`);

      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength ?? 0;

          useUpdaterStore.getState().setProgress({
            downloadedBytes: 0,
            downloadProgress: 0,
            totalBytes,
          });
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          const downloadProgress =
            totalBytes > 0
              ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
              : 0;

          useUpdaterStore.getState().setProgress({
            downloadedBytes,
            downloadProgress,
            totalBytes,
          });
        } else if (event.event === "Finished") {
          useUpdaterStore.getState().setProgress({
            downloadedBytes,
            downloadProgress: 100,
            totalBytes,
          });
        }
      });

      logger.info("Update installed successfully");
      useUpdaterStore.getState().setStatus("ready");
      useUpdaterStore.getState().setDismissed(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to install update";

      logger.error("Failed to install update", error);
      useUpdaterStore.getState().setStatus("error");
      useUpdaterStore.getState().setError(message);
    }
  }

  reset(): void {
    useUpdaterStore.getState().reset();
  }

  async restart(): Promise<void> {
    try {
      logger.info("Restarting application");

      await relaunch();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to restart application";

      logger.error("Failed to restart application", error);
      useUpdaterStore.getState().setStatus("error");
      useUpdaterStore.getState().setError(message);
    }
  }
}

export const updaterService = new UpdaterService();
