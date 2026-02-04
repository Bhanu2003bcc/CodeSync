// import { API_BASE_URL } from "../config";

// export async function fetchSessions(token) {
//   const res = await fetch(`${API_BASE_URL}/api/sessions`, {
//     headers: {
//       Authorization: `Bearer ${token}`
//     }
//   });

//   if (!res.ok) {
//     throw new Error("Failed to fetch sessions");
//   }

//   return res.json();
// }

// export async function createSession(token, payload) {
//   const res = await fetch(`${API_BASE_URL}/api/sessions`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`
//     },
//     body: JSON.stringify(payload)
//   });

//   if (!res.ok) {
//     throw new Error("Failed to create session");
//   }

//   return res.json();
// }
// import { API_BASE_URL } from "../config";

// /**
//  * Helper to consolidate headers. 
//  * This ensures every request to the Session Service is authenticated.
//  */
// const getAuthHeaders = (isJson = true) => {
//   const token = localStorage.getItem("token");
//   const headers = {};

//   if (isJson) {
//       headers["Content-Type"] = "application/json";
//   }

//   if (token) {
//       // 🚀 Matches the 'Bearer ' check in your Gateway's JwtAuthFilter
//       headers["Authorization"] = `Bearer ${token}`;
//   }

//   return headers;
// };

// // export async function fetchSessions() {
// //   const token = localStorage.getItem("token"); // Retrieve the saved token

// //   const res = await fetch(`${API_BASE_URL}/api/sessions`, {
// //     headers: {
// //       "Authorization": `Bearer ${token}` // Ensure this matches JwtAuthFilter logic
// //     }
// //   });

// //   if (res.status === 401) {
// //     console.error("The Gateway rejected the token.");
// //   }

// //   return res.json();
// // }
// export async function fetchSessions(token) {
//   console.log("FETCH SESSIONS TOKEN =", token);

//   const res = await fetch(`http://localhost:8080/api/sessions`, {
//     headers: {
//       Authorization: `Bearer ${token}`
//     }
//   });

//   console.log("FETCH SESSIONS STATUS =", res.status);

//   if (!res.ok) {
//     throw new Error("Failed to fetch sessions");
//   }

//   return res.json();
// }

// export async function createSession(payload) {
//   const res = await fetch(`${API_BASE_URL}/api/sessions`, {
//     method: "POST",
//     headers: getAuthHeaders(),
//     body: JSON.stringify(payload)
//   });

//   if (res.status === 401) {
//     throw new Error("You must be logged in to create a session.");
//   }

//   if (!res.ok) {
//     throw new Error("Failed to create session");
//   }

//   return res.json();
// }
// import { API_BASE_URL } from "../config";

// const getAuthHeaders = (isJson = true) => {
//   const token = localStorage.getItem("token");
//   const headers = {};

//   if (isJson) {
//     headers["Content-Type"] = "application/json";
//   }

//   if (token) {
//     headers["Authorization"] = `Bearer ${token}`;
//   }

//   return headers;
// };

// export async function fetchSessions() {
//   const res = await fetch(`${API_BASE_URL}/api/sessions`, {
//     headers: getAuthHeaders()
//   });

//   if (res.status === 401) {
//     console.error("The Gateway rejected the token.");
//   }

//   if (!res.ok) {
//     throw new Error("Failed to fetch sessions");
//   }

//   return res.json();
// }

// export async function createSession(payload) {
//   const res = await fetch(`${API_BASE_URL}/api/sessions`, {
//     method: "POST",
//     headers: getAuthHeaders(),
//     body: JSON.stringify(payload)
//   });

//   if (res.status === 401) {
//     throw new Error("You must be logged in to create a session.");
//   }

//   if (!res.ok) {
//     throw new Error("Failed to create session");
//   }

//   return res.json();
// }
import { API_BASE_URL } from "../config";

const getAuthHeaders = (isJson = true) => {
  const token = localStorage.getItem("token");
  const headers = {};
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export async function fetchSessions() {
  // ✅ FIXED - Use parentheses, not backticks
  const res = await fetch(`${API_BASE_URL}/api/sessions`, {
    headers: getAuthHeaders()
  });

  if (res.status === 401) {
    console.error("The Gateway rejected the token.");
  }
  if (!res.ok) {
    throw new Error("Failed to fetch sessions");
  }
  return res.json();
}

export async function createSession(payload) {
  // ✅ FIXED - Use parentheses, not backticks
  const res = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (res.status === 401) {
    throw new Error("You must be logged in to create a session.");
  }
  if (!res.ok) {
    throw new Error("Failed to create session");
  }
  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: "DELETE",
    headers: getAuthHeaders(false)
  });

  if (res.status === 403) {
    throw new Error("Only the session owner can delete this session.");
  }
  if (!res.ok) {
    throw new Error("Failed to delete session");
  }
  return true;
}

/**
 * Get a single session by ID
 */
export async function getSession(sessionId) {
  const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    headers: getAuthHeaders(false)
  });

  if (!res.ok) {
    throw new Error("Failed to fetch session");
  }
  return res.json();
}