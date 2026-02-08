import { invoke } from "@tauri-apps/api/core";

import { Logger } from "./logger";

const logger = new Logger("Secret");

export class SecretService {
  async setSecret(secret: string): Promise<void> {
    logger.debug("Setting secret");

    await invoke<void>("set_secret", { secret });
  }

  async unsetSecret(): Promise<void> {
    logger.debug("Unsetting secret");

    await invoke<void>("unset_secret");
  }

  async saveSecret(secret: string): Promise<void> {
    logger.debug("Saving secret");

    await invoke<void>("save_secret", { secret });
  }

  async loadSecret(): Promise<string | null> {
    try {
      logger.debug("Loading secret");

      return await invoke<string>("load_secret");
    } catch (error) {
      logger.error("Failed to load secret", error);

      return null;
    }
  }

  async clearSecret(): Promise<void> {
    logger.debug("Clearing secret");

    await invoke<void>("clear_secret");
  }
}

export const secretService = new SecretService();
