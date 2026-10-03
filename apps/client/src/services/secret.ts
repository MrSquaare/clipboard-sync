import { invoke } from "@tauri-apps/api/core";

import { Logger } from "./logger";

const logger = new Logger("Secret");

export class SecretService {
  async clearSecret(): Promise<void> {
    logger.debug("Clearing secret");

    await invoke<void>("clear_secret");
  }

  async loadSecret(): Promise<null | string> {
    try {
      logger.debug("Loading secret");

      return await invoke<string>("load_secret");
    } catch (error) {
      logger.error("Failed to load secret", error);

      return null;
    }
  }

  async saveSecret(secret: string): Promise<void> {
    logger.debug("Saving secret");

    await invoke<void>("save_secret", { secret });
  }

  async setSecret(secret: string): Promise<void> {
    logger.debug("Setting secret");

    await invoke<void>("set_secret", { secret });
  }

  async unsetSecret(): Promise<void> {
    logger.debug("Unsetting secret");

    await invoke<void>("unset_secret");
  }
}

export const secretService = new SecretService();
