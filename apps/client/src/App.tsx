import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import { attachConsole } from "@tauri-apps/plugin-log";
import { type FC } from "react";

import { ErrorBoundary } from "./components/error-boundary";
import { LoadingOverlay } from "./components/loading-overlay";
import { UpdateBanner } from "./components/update-banner";
import { useAutoUpdater } from "./hooks/use-auto-updater";
import { useWindowBehavior } from "./hooks/use-window-behavior";
import { ConnectionScreen } from "./screens/connection";
import { RoomScreen } from "./screens/room";
import { useConnectionStore } from "./stores/connection";

attachConsole();

const AppContent: FC = () => {
  const { status } = useConnectionStore();

  useWindowBehavior();
  useAutoUpdater();

  if (["reconnecting", "disconnecting"].includes(status)) {
    return <LoadingOverlay />;
  }

  return (
    <>
      <UpdateBanner />
      {status === "connected" ? <RoomScreen /> : <ConnectionScreen />}
    </>
  );
};

export const App: FC = () => {
  return (
    <MantineProvider defaultColorScheme={"dark"}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </MantineProvider>
  );
};
