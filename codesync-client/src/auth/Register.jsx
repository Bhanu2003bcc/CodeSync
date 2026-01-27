import { useState } from "react";
import { register as registerApi } from "../api/authApi";
import { useAuth } from "./AuthContext";

export default function Register({ onSwitchToLogin }) {
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await registerApi(
        form.username,
        form.email,
        form.password
      );
      login(res.token);
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <div className="auth-logo-icon">⚡</div>
        <h1>CodeSync</h1>
      </div>

      <div className="auth-title">
        <h2>Create account</h2>
        <p>Join CodeSync to start collaborating</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <span className="input-icon">👤</span>
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>

        <div className="input-group">
          <span className="input-icon">✉️</span>
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <div className="auth-switch">
        Already have an account?{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin?.(); }}>
          Sign in
        </a>
      </div>
    </div>
  );
}
