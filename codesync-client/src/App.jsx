import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./auth/Login";
import OAuthCallback from "./auth/OAuthCallback";
import Dashboard from "./pages/Dashboard";

function Router() {
  const { user } = useAuth();

  // Check if this is OAuth callback
  const isCallback = window.location.pathname === "/auth/callback";
  if (isCallback) {
    return <OAuthCallback />;
  }

  if (!user) {
    return (
      <div className="auth-container">
        <Login />
      </div>
    );
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
