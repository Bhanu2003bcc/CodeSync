import { useEffect, useState } from "react";
import { connectWebSocket, disconnectWebSocket } from "../realtime/wsClient";
import { useAuth } from "../auth/AuthContext";

export default function SessionWorkspace({ sessionId, onClose }) {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [stomp, setStomp] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    connectWebSocket(token, client => {
      setStomp(client);
      setConnected(true);

      // Subscribe to session topic
      client.subscribe(
        `/topic/session/${sessionId}`,
        message => {
          const body = JSON.parse(message.body);

          if (body.type === "USER_JOINED") {
            setUsers(prev =>
              prev.includes(body.username)
                ? prev
                : [...prev, body.username]
            );
          }
        }
      );

      // Join session
      client.publish({
        destination: `/app/session/${sessionId}/join`,
        body: JSON.stringify({})
      });
    });

    return () => {
      disconnectWebSocket();
    };
  }, [token, sessionId]);

  function sendCursor(e) {
    if (!stomp) return;

    stomp.publish({
      destination: `/app/session/${sessionId}/cursor`,
      body: JSON.stringify({
        filePath: "DemoFile.js",
        line: Math.floor(Math.random() * 100),
        column: Math.floor(Math.random() * 80)
      })
    });
  }

  return (
    <div className="workspace">
      <div className="workspace-header">
        <div>
          <h2>📝 Session Workspace</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            ID: {sessionId}
          </p>
        </div>
        <div className="flex items-center gap-md">
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: connected ? 'var(--color-success)' : 'var(--color-warning)'
            }}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? 'var(--color-success)' : 'var(--color-warning)'
            }}></span>
            {connected ? 'Connected' : 'Connecting...'}
          </span>
          {onClose && (
            <button className="secondary small" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-md" style={{ marginBottom: 'var(--space-lg)' }}>
        <p>👤 Logged in as: <strong>{user?.username}</strong></p>
      </div>

      <div className="online-users">
        <h3>Online Users ({users.length})</h3>

        {users.length === 0 ? (
          <p className="text-muted">Waiting for users to join...</p>
        ) : (
          <ul className="users-list">
            {users.map(u => (
              <li key={u}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--color-success)'
                }}></span>
                {u}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-xl)' }}>
        <button onClick={sendCursor}>
          🎯 Send Random Cursor Update
        </button>
      </div>
    </div>
  );
}
