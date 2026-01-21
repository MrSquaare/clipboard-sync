import { useEffect, useRef } from "react";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useAppStore } from "../store/useAppStore";
import { networkService } from "../services/NetworkService";

export function useClipboard() {
  const isConnected = useAppStore((s) => s.connectionStatus === "connected");
  const lastContent = useRef<string>("");
  const isWritingRemote = useRef(false);

  useEffect(() => {
    console.log(`[Clipboard] Hook mounted. Connected? ${isConnected}`);

    if (!isConnected) {
      console.log("[Clipboard] Not connected. Sync paused.");
      return;
    }

    console.log("[Clipboard] Starting polling interval...");

    // 1. Polling for local changes
    const interval = setInterval(async () => {
      try {
        const text = await readText();

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
            console.log(`[Clipboard] Ignoring change (caused by remote write)`);
          }
        }
      } catch (e) {
        console.error("[Clipboard] Read error:", e);
        useAppStore.getState().addLog(`[Clipboard] Read Error: ${e}`, "error");
      }
    }, 1000);

    // 2. Listen for remote updates
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
      clearInterval(interval);
      window.removeEventListener("clipboard-remote-update", handleRemote);
    };
  }, [isConnected]);
}
