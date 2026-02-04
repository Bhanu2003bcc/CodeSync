import { useEffect, useState } from "react";
import { fetchSessions, deleteSession } from "../api/sessionApi";
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
  function handleJoinSession(sessionId, repoUrl = '') {
    setActiveSession({ id: sessionId, repoUrl });
  }

  // Delete a session
  async function handleDeleteSession(sessionId) {
    if (!confirm("Are you sure you want to delete this session? This cannot be undone.")) {
      return;
    }
    try {
      await deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
    } catch (e) {
      alert(`Failed to delete session: ${e.message}`);
    }
  }

  // Get user initials for avatar
  const initials = user?.username?.slice(0, 2) || "U";

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="auth-logo-icon">🔀</div>
          <h1>CodeReview</h1>
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
                      activeSession?.id === session.id ? null : session
                    )}
                  >
                    {activeSession?.id === session.id ? "Close" : "Open"}
                  </button>
                  <button
                    className="small danger"
                    onClick={() => handleDeleteSession(session.id)}
                    style={{ marginLeft: '8px', background: '#e53e3e' }}
                  >
                    🗑️ Delete
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
          sessionId={activeSession.id}
          repoUrl={activeSession.repoUrl}
          onClose={() => setActiveSession(null)}
        />
      )}
    </div>
  );
}

