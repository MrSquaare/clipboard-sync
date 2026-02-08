import { invoke } from "@tauri-apps/api/core";

export class PlatformService {
  async getDeviceName(): Promise<string> {
    return invoke("get_device_name");
  }
}

export const platformService = new PlatformService();
