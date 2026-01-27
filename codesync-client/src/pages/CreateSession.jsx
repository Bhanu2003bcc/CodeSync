import { useState } from "react";
import { createSession } from "../api/sessionApi";

export default function CreateSession({ onCreated }) {
  const [form, setForm] = useState({
    repoUrl: "",
    baseBranch: "",
    compareBranch: "",
    title: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await createSession(form);
      onCreated();
      setForm({
        repoUrl: "",
        baseBranch: "",
        compareBranch: "",
        title: "",
        description: ""
      });
      setExpanded(false);
    } catch (e) {
      console.error("Session creation error:", e);
      alert("Session creation failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-session">
      <div
        className="section-header"
        style={{ cursor: 'pointer', marginBottom: expanded ? 'var(--space-lg)' : 0 }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3>
          ➕ Create New Session
        </h3>
        <span style={{
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease',
          display: 'inline-block'
        }}>
          ▼
        </span>
      </div>

      {expanded && (
        <form className="create-session-form" onSubmit={handleSubmit}>
          <input
            placeholder="Session Title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />

          <input
            placeholder="Repository URL"
            value={form.repoUrl}
            onChange={e => setForm({ ...form, repoUrl: e.target.value })}
            required
          />

          <input
            placeholder="Base Branch (e.g., main)"
            value={form.baseBranch}
            onChange={e => setForm({ ...form, baseBranch: e.target.value })}
            required
          />

          <input
            placeholder="Compare Branch (e.g., feature/xyz)"
            value={form.compareBranch}
            onChange={e => setForm({ ...form, compareBranch: e.target.value })}
            required
          />

          <textarea
            className="full-width"
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Session"}
          </button>
        </form>
      )}
    </div>
  );
}