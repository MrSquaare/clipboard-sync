import { invoke } from "@tauri-apps/api/core";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

import { Logger } from "./logger";

const logger = new Logger("Platform");

export class PlatformService {
  async getDeviceName(): Promise<string | null> {
    try {
      return await invoke("get_device_name");
    } catch (error) {
      logger.error("Failed to get device name", error);

      return null;
    }
  }

  async isAutoStartEnabled(): Promise<boolean> {
    try {
      return await isEnabled();
    } catch (error) {
      logger.error("Failed to check auto-start status", error);

      return false;
    }
  }

  async enableAutoStart(): Promise<void> {
    try {
      await enable();
    } catch (error) {
      logger.error("Failed to enable auto-start", error);
    }
  }

  async disableAutoStart(): Promise<void> {
    try {
      await disable();
    } catch (error) {
      logger.error("Failed to disable auto-start", error);
    }
  }
}

export const platformService = new PlatformService();
