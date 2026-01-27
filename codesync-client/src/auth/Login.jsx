import { useState } from "react";
import { login as loginApi } from "../api/authApi";
import { useAuth } from "./AuthContext";

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginApi(email, password);
      login(res.token);
    } catch {
      setError("Invalid credentials. Please try again.");
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
        <h2>Welcome back</h2>
        <p>Sign in to continue to your workspace</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <span className="input-icon">✉️</span>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="auth-switch">
        Don't have an account?{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister?.(); }}>
          Create one
        </a>
      </div>
    </div>
  );
}
