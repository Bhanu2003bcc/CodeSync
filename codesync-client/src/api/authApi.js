import { API_BASE_URL } from "../config";

export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    throw new Error("Login failed");
  }

  const data = await res.json();
  
  if(data.token){
    localStorage.setItem("token", data.token);
  }

  return data;
}

export async function register(username, email, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, email, password })
  });

  if (!res.ok) {
    throw new Error("Registration failed");
  }

  return res.json();
}

export async function fetchMe(token) {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  return res.json();
}
