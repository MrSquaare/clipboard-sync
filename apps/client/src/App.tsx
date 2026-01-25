import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";

import { Dashboard } from "./components/dashboard/Dashboard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Setup } from "./components/setup/Setup";
import { NetworkProvider } from "./contexts/network";
import { useClipboard } from "./hooks/useClipboard";
import { useNetworkStore } from "./store/useNetworkStore";

function AppContent() {
  const connectionStatus = useNetworkStore((s) => s.connectionStatus);

  useClipboard();

  return connectionStatus === "disconnected" ? <Setup /> : <Dashboard />;
}

function App() {
  return (
    <MantineProvider defaultColorScheme={"dark"} forceColorScheme={"dark"}>
      <ErrorBoundary>
        <NetworkProvider>
          <AppContent />
        </NetworkProvider>
      </ErrorBoundary>
    </MantineProvider>
  );
}

export default App;
