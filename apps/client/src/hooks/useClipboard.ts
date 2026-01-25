import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useEffect, useRef } from "react";

import { useNetwork } from "../contexts/network";
import { useClipboardStore } from "../store/useClipboardStore";
import { useLogStore } from "../store/useLogStore";
import { useNetworkStore } from "../store/useNetworkStore";
import { useSettingsStore } from "../store/useSettingsStore";

export function useClipboard() {
  const networkService = useNetwork();
  const isConnected = useNetworkStore(
    (s) => s.connectionStatus === "connected",
  );
  const lastRemoteClipboard = useClipboardStore((s) => s.lastRemoteClipboard);
  const pollingInterval = useSettingsStore((s) => s.pollingInterval);
  const { addLog } = useLogStore();
  const lastContent = useRef<string>("");
  const isWritingRemote = useRef(false);

  const syncRemote = useCallback(
    async (text: string) => {
      console.log(
        `[Clipboard] Received remote update: "${text.slice(0, 20)}..."`,
      );

      isWritingRemote.current = true;

      try {
        await writeText(text);
        lastContent.current = text;

        console.log("[Clipboard] Wrote remote content");
        addLog(`[Clipboard] Wrote remote content`, "success");
      } catch (err) {
        console.error("[Clipboard] Write failed", err);
        addLog(`[Clipboard] Write failed: ${err}`, "error");
      } finally {
        isWritingRemote.current = false;
        console.log("[Clipboard] Ready for local changes");
      }
    },
    [addLog],
  );

  const setupPolling = useCallback(
    async (active: boolean) => {
      try {
        const text = await readText();

        if (!active) return;

        if (text) {
          lastContent.current = text;
          console.log("[Clipboard] Baseline captured.");
        }
      } catch (e) {
        console.error("[Clipboard] Baseline read error:", e);
      }

      if (!active) return;

      console.log(
        `[Clipboard] Starting polling interval (${pollingInterval}ms)...`,
      );

      return setInterval(async () => {
        try {
          const text = await readText();

          if (!active) return;

          if (text && text !== lastContent.current) {
            if (!isWritingRemote.current) {
              lastContent.current = text;
              console.log(
                `[Clipboard] Local change detected: "${text.slice(0, 20)}..."`,
              );
              addLog(`[Clipboard] Local copy: ${text.length} chars`, "info");

              await networkService.broadcastClipboard(text);
            } else {
              console.log(
                `[Clipboard] Ignoring change (caused by remote write)`,
              );
            }
          }
        } catch (e) {
          console.error("[Clipboard] Read error:", e);

          addLog(`[Clipboard] Read Error: ${e}`, "error");
        }
      }, pollingInterval);
    },
    [addLog, networkService, pollingInterval],
  );

  useEffect(() => {
    if (!lastRemoteClipboard) return;

    syncRemote(lastRemoteClipboard);
  }, [lastRemoteClipboard, syncRemote]);

  useEffect(() => {
    console.log(`[Clipboard] Hook mounted. Connected? ${isConnected}`);

    if (!isConnected) {
      console.log("[Clipboard] Not connected. Sync paused.");
      return;
    }

    let active = true;
    let interval: number | undefined;

    setupPolling(active).then((value) => {
      interval = value;
    });

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isConnected, setupPolling]);
}
