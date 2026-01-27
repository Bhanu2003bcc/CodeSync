import { useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Dashboard from "./pages/Dashboard";

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-container">
      {isLogin ? (
        <Login onSwitchToRegister={() => setIsLogin(false)} />
      ) : (
        <Register onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  );
}

function Router() {
  const { user } = useAuth();

  if (!user) {
    return <AuthPage />;
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
