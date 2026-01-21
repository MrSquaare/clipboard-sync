import "./App.css";
import { useAppStore } from "./store/useAppStore";
import { useClipboard } from "./hooks/useClipboard";
import { SetupForm } from "./components/SetupForm";
import { Dashboard } from "./components/Dashboard";

function App() {
  const connectionStatus = useAppStore((s) => s.connectionStatus);

  // Initialize clipboard hooks
  useClipboard();

  return (
    <div className="container">
      <h1>Clipboard Sync</h1>

      {connectionStatus === "disconnected" ? <SetupForm /> : <Dashboard />}
    </div>
  );
}

export default App;
