import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    localStorage.getItem("codesync_token")
  );
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!token) return;

    fetchMe(token)
      .then(data => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) logout();
      });

    return () => {
      cancelled = true;
    };
  }, [token]);


  function login(token) {
    localStorage.setItem("codesync_token", token);
    setToken(token);
  }

  function logout() {
    localStorage.removeItem("codesync_token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
// export function AuthProvider({ children }) {
//   // 🚀 Change 'codesync_token' to 'token' to match sessionApi.js and authApi.js
//   const [token, setToken] = useState(
//     localStorage.getItem("token")
//   );
//   const [user, setUser] = useState(null);

//   // ... (useEffect logic remains the same)

//   function login(token) {
//     localStorage.setItem("token", token); // 🚀 Standardized key
//     setToken(token);
//   }

//   function logout() {
//     localStorage.removeItem("token"); // 🚀 Standardized key
//     setToken(null);
//     setUser(null);
//   }

//   return (
//     <AuthContext.Provider value={{ token, user, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

export function useAuth() {
  return useContext(AuthContext);
}
