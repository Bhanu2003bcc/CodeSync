import { useEffect, useState } from "react";
import { fetchSessions } from "../api/sessionApi";
import { useAuth } from "../auth/AuthContext";
import CreateSession from "./CreateSession";
import JoinSession from "./JoinSession";
import SessionWorkspace from "./SessionWorkspace";

export default function Dashboard() {
  const { token, user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  async function loadSessions() {
    try {
      const data = await fetchSessions(token);
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && token) {
      loadSessions();
    }
  }, [user, token]);

  // Copy session ID to clipboard
  function copySessionId(sessionId) {
    navigator.clipboard.writeText(sessionId);
    setCopiedId(sessionId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Join a session by ID (from another user)
  function handleJoinSession(sessionId) {
    setActiveSession(sessionId);
  }

  // Get user initials for avatar
  const initials = user?.username?.slice(0, 2) || "U";

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="auth-logo-icon">⚡</div>
          <h1>CodeSync</h1>
        </div>

        <div className="dashboard-user">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="user-role">Developer</span>
          </div>
          <div className="user-avatar">{initials}</div>
          <button className="secondary small" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* Create Session */}
      <CreateSession onCreated={loadSessions} />

      {/* Join Session - NEW */}
      <JoinSession onJoin={handleJoinSession} />

      {/* Sessions Section */}
      <section className="sessions-section">
        <div className="section-header">
          <h2>📂 Your Review Sessions</h2>
          <span className="text-muted">{sessions.length} sessions</span>
        </div>

        {loading ? (
          <div className="loading">Loading sessions</div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-muted mt-lg">
            <p>No review sessions yet. Create your first one above!</p>
          </div>
        ) : (
          <ul className="sessions-grid">
            {sessions.map((session, index) => (
              <li
                key={session.id}
                className="session-card"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="session-card-header">
                  <div>
                    <div className="session-title">
                      {session.title || "Untitled Session"}
                    </div>
                    <div className="session-status">Active</div>
                  </div>
                </div>

                <div className="session-url">
                  🔗 {session.repoUrl}
                </div>

                {/* Session ID for sharing */}
                <div className="session-id-share">
                  <span className="session-id-label">ID:</span>
                  <code className="session-id-value">{session.id}</code>
                  <button
                    className="small secondary copy-btn"
                    onClick={() => copySessionId(session.id)}
                  >
                    {copiedId === session.id ? "✓ Copied!" : "📋 Copy"}
                  </button>
                </div>

                <div className="session-card-footer">
                  <button
                    className="small"
                    onClick={() => setActiveSession(
                      activeSession === session.id ? null : session.id
                    )}
                  >
                    {activeSession === session.id ? "Close" : "Open"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Active Session Workspace */}
      {activeSession && (
        <SessionWorkspace
          sessionId={activeSession}
          onClose={() => setActiveSession(null)}
        />
      )}
    </div>
  );
}

