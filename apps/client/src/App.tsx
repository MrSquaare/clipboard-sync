import "@mantine/core/styles.css";

import { MantineProvider } from "@mantine/core";

import { Dashboard } from "./components/Dashboard";
import { Setup } from "./components/Setup";
import { useClipboard } from "./hooks/useClipboard";
import { useAppStore } from "./store/useAppStore";

function App() {
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  useClipboard();

  return (
    <MantineProvider defaultColorScheme="dark" forceColorScheme="dark">
      {connectionStatus === "disconnected" ? <Setup /> : <Dashboard />}
    </MantineProvider>
  );
}

export default App;
