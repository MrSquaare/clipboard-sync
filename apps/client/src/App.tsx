import "@mantine/core/styles.css";

import { useAppStore } from "./store/useAppStore";
import { useClipboard } from "./hooks/useClipboard";
import { Setup } from "./components/Setup";
import { Dashboard } from "./components/Dashboard";
import { MantineProvider } from "@mantine/core";

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
