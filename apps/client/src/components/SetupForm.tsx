import { useState } from "react";
import { TransportMode, useSettingsStore } from "../store/useSettingsStore";
import { networkService } from "../services/NetworkService";

export function SetupForm() {
  const {
    serverUrl,
    setServerUrl,
    roomId,
    setRoomId,
    transportMode,
    setTransportMode,
    pollingInterval,
    setPollingInterval,
    pingInterval,
    setPingInterval,
    developerMode,
    setDeveloperMode,
  } = useSettingsStore();
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !secret) {
      setError("Room ID and Secret are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await networkService.joinRoom(secret);
    } catch (err) {
      setError("Failed to connect: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Connect to Room</h2>
      <form onSubmit={handleJoin} className="flex-col">
        <div className="input-group">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label>Server URL</label>
            <span
              onClick={() => setServerUrl(__DEFAULT_SERVER_URL__)}
              style={{
                cursor: "pointer",
                fontSize: "0.8em",
                textDecoration: "underline",
                color: "#666",
              }}
              title={__DEFAULT_SERVER_URL__}
            >
              Default
            </span>
          </div>
          <input
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="wss://..."
          />
        </div>

        <div className="input-group">
          <label>Room ID</label>
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="my-room"
          />
        </div>

        <div className="input-group">
          <label>Secret Key</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Shared secret"
          />
        </div>

        <div className="input-group">
          <label>Transport</label>
          <select
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value as TransportMode)}
          >
            <option value="auto">Auto (Mesh)</option>
            <option value="p2p">P2P Only</option>
            <option value="relay">Relay Only</option>
          </select>
        </div>

        <div
          style={{ cursor: "pointer", color: "#666", fontSize: "0.9em" }}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "▼ Hide Advanced" : "▶ Show Advanced"}
        </div>

        {showAdvanced && (
          <div
            className="advanced-section"
            style={{ borderTop: "1px solid #eee", paddingTop: "10px" }}
          >
            <div className="input-group">
              <label>Clipboard Polling (ms)</label>
              <input
                type="number"
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                min={100}
              />
            </div>
            <div className="input-group">
              <label>Ping Interval (ms)</label>
              <input
                type="number"
                value={pingInterval}
                onChange={(e) => setPingInterval(Number(e.target.value))}
                min={5000}
              />
            </div>
            <div
              className="input-group flex-row"
              style={{ alignItems: "center", gap: "10px" }}
            >
              <input
                id="devMode"
                type="checkbox"
                checked={developerMode}
                onChange={(e) => setDeveloperMode(e.target.checked)}
                style={{ width: "auto" }}
              />
              <label htmlFor="devMode" style={{ margin: 0 }}>
                Developer Mode
              </label>
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Join Room"}
        </button>
      </form>
    </div>
  );
}
