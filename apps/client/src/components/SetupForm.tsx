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
  } = useSettingsStore();
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          <label>Server URL</label>
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

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Connecting..." : "Join Room"}
        </button>
      </form>
    </div>
  );
}
