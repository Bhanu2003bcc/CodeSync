// API Base URL - uses environment variable in production
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// WebSocket URL - uses environment variable in production
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || "http://localhost:8084";
