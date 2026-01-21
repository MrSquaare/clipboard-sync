import { useEffect, useRef } from "react";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { networkService } from "../services/NetworkService";

export function useClipboard() {
  const isConnected = useAppStore((s) => s.connectionStatus === "connected");
  const pollingInterval = useSettingsStore((s) => s.pollingInterval);
  const lastContent = useRef<string>("");
  const isWritingRemote = useRef(false);

  useEffect(() => {
    console.log(`[Clipboard] Hook mounted. Connected? ${isConnected}`);

    if (!isConnected) {
      console.log("[Clipboard] Not connected. Sync paused.");
      return;
    }

    let interval: number | undefined;
    let active = true;

    const setupPolling = async () => {
      // 1. Baseline: Read current clipboard content
      try {
        const text = await readText();
        if (!active) return; // Effect cleaned up while reading baseline

        if (text) {
          lastContent.current = text;
          console.log(
            "[Clipboard] Baseline captured. Monitoring for changes...",
          );
        }
      } catch (e) {
        console.error("[Clipboard] Baseline read error:", e);
      }

      if (!active) return;

      console.log(
        `[Clipboard] Starting polling interval (${pollingInterval}ms)...`,
      );

      // 2. Start polling for local changes
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

    // 3. Listen for remote updates
    const handleRemote = async (e: Event) => {
      const text = (e as CustomEvent).detail;
      console.log(
        `[Clipboard] Received remote update event: "${text.slice(0, 20)}..."`,
      );

      isWritingRemote.current = true;
      try {
        await writeText(text);
        lastContent.current = text;
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
        setTimeout(() => {
          isWritingRemote.current = false;
          console.log("[Clipboard] Ready for local changes");
        }, 1500);
      }
    };

    window.addEventListener("clipboard-remote-update", handleRemote);

    return () => {
      active = false;
      if (interval) window.clearInterval(interval);
      window.removeEventListener("clipboard-remote-update", handleRemote);
    };
  }, [isConnected, pollingInterval]);
}
