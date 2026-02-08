import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";
import { attachConsole } from "@tauri-apps/plugin-log";
import { type FC } from "react";

import { ErrorBoundary } from "./components/error-boundary";
import { LoadingOverlay } from "./components/loading-overlay";
import { useWindowBehavior } from "./hooks/use-window-behavior";
import { ConnectionScreen } from "./screens/connection";
import { RoomScreen } from "./screens/room";
import { useConnectionStore } from "./stores/connection";

attachConsole();

const AppContent: FC = () => {
  const { status } = useConnectionStore();

  useWindowBehavior();

  if (["reconnecting", "disconnecting"].includes(status)) {
    return <LoadingOverlay />;
  }

  if (status === "connected") {
    return <RoomScreen />;
  }

  return <ConnectionScreen />;
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
