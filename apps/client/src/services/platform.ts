import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

import { Logger } from "./logger";

const logger = new Logger("Platform");

export class PlatformService {
  async disableAutoStart(): Promise<void> {
    try {
      await disable();
    } catch (error) {
      logger.error("Failed to disable auto-start", error);
    }
  }

  async enableAutoStart(): Promise<void> {
    try {
      await enable();
    } catch (error) {
      logger.error("Failed to enable auto-start", error);
    }
  }

  async getDeviceName(): Promise<null | string> {
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
}

export const platformService = new PlatformService();
