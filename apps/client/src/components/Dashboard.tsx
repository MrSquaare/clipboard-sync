import { useAppStore } from "../store/useAppStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { networkService } from "../services/NetworkService";

export function Dashboard() {
  const { myId, clients, logs } = useAppStore();
  const { roomId, serverUrl, developerMode } = useSettingsStore();

  return (
    <div className="dashboard">
      <header className="flex-row between">
        <div>
          <h3>Room: {roomId}</h3>
          <small style={{ display: "block", color: "#888" }}>
            Server: {serverUrl}
          </small>
          <small>My ID: {myId?.slice(0, 8)}</small>
        </div>
        <button onClick={() => networkService.disconnect()} className="danger">
          Disconnect
        </button>
      </header>

      <div className={`grid-2 ${developerMode ? "" : "full-width"}`}>
        <div className="card">
          <h3>Clients ({clients.length})</h3>
          {clients.length === 0 ? (
            <p className="text-muted">No clients connected.</p>
          ) : (
            <ul className="peer-list">
              {clients.map((p) => (
                <li key={p.id} className="peer-item">
                  <span>{p.id.slice(0, 8)}...</span>
                  <span className={`badge ${p.status}`}>{p.status}</span>
                  <span className="badge neutral">{p.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {developerMode && (
          <div className="card">
            <h3>Debug Log</h3>
            <div className="log-container">
              {logs.map((log) => (
                <div key={log.id} className={`log-entry ${log.type}`}>
                  <span className="time">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="msg">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
