import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useEffect, useRef } from "react";

import { useNetwork } from "../contexts/network";
import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";

export function useClipboard() {
  const networkService = useNetwork();
  const isConnected = useAppStore((s) => s.connectionStatus === "connected");
  const lastRemoteClipboard = useAppStore((s) => s.lastRemoteClipboard);
  const pollingInterval = useSettingsStore((s) => s.pollingInterval);
  const lastContent = useRef<string>("");
  const isWritingRemote = useRef(false);

  // Effect to handle remote clipboard updates
  useEffect(() => {
    if (!lastRemoteClipboard) return;

    const syncRemote = async () => {
      console.log(
        `[Clipboard] Received remote update: "${lastRemoteClipboard.slice(0, 20)}..."`,
      );

      isWritingRemote.current = true;

      try {
        await writeText(lastRemoteClipboard);
        lastContent.current = lastRemoteClipboard;

        console.log("[Clipboard] Successfully wrote to system clipboard");
        useAppStore
          .getState()
          .addLog(`[Clipboard] Wrote remote content`, "success");
      } catch (err) {
        console.error("[Clipboard] Write failed", err);
        useAppStore
          .getState()
          .addLog(`[Clipboard] Write failed: ${err}`, "error");
      } finally {
        isWritingRemote.current = false;
        console.log("[Clipboard] Ready for local changes");
      }
    };

    syncRemote();
  }, [lastRemoteClipboard]);

  // Effect to poll for local changes
  useEffect(() => {
    console.log(`[Clipboard] Hook mounted. Connected? ${isConnected}`);

    if (!isConnected) {
      console.log("[Clipboard] Not connected. Sync paused.");
      return;
    }

    let interval: number | undefined;
    let active = true;

    const setupPolling = async () => {
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

      interval = window.setInterval(async () => {
        try {
          const text = await readText();

          if (!active) return;

          if (text && text !== lastContent.current) {
            if (!isWritingRemote.current) {
              console.log(
                `[Clipboard] Local change detected: "${text.slice(0, 20)}..."`,
              );
              lastContent.current = text;
              useAppStore
                .getState()
                .addLog(`[Clipboard] Local copy: ${text.length} chars`, "info");

              await networkService.broadcastClipboard(text);
            } else {
              console.log(
                `[Clipboard] Ignoring change (caused by remote write)`,
              );
            }
          }
        } catch (e) {
          console.error("[Clipboard] Read error:", e);

          useAppStore
            .getState()
            .addLog(`[Clipboard] Read Error: ${e}`, "error");
        }
      }, pollingInterval);
    };

    setupPolling();

    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
    };
  }, [isConnected, pollingInterval, networkService]);
}
