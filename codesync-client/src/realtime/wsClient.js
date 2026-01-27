// import { Client } from "@stomp/stompjs";
// import SockJS from "sockjs-client";
// import { API_BASE_URL } from "../config";

// let stompClient = null;

// export function connectWebSocket(token, onConnected) {
//   stompClient = new Client({
//     webSocketFactory: () =>
//       new SockJS(`${API_BASE_URL}/ws`),

//     connectHeaders: {
//       Authorization: `Bearer ${token}`
//     },

//     debug: str => console.log("[WS]", str),

//     reconnectDelay: 5000
//   });

//   stompClient.onConnect = () => {
//     console.log("WebSocket connected");
//     onConnected(stompClient);
//   };

//   stompClient.onStompError = frame => {
//     console.error("Broker error", frame);
//   };

//   stompClient.activate();
// }

// export function disconnectWebSocket() {
//   if (stompClient) {
//     stompClient.deactivate();
//     stompClient = null;
//   }
// }
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_BASE_URL } from "../config";

let stompClient = null;

export function connectWebSocket(token, onConnected) {
  // ✅ FIX: Append token as a query parameter.
  // Browsers cannot send custom headers during the initial SockJS/Handshake request.
  // This allows your Gateway Filter to see the token for the initial /info and handshake calls.
  const socketUrl = `${API_BASE_URL}/ws?token=${token}`;

  stompClient = new Client({
    // Using a factory ensures a fresh connection for every (re)connect attempt
    webSocketFactory: () => new SockJS(socketUrl),

    // Still include the header for the STOMP protocol level if needed by sub-services
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },

    debug: (str) => {
      // Cleaner debugging to track the flow
      console.log("[STOMP Debug]", str);
    },

    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  stompClient.onConnect = (frame) => {
    console.log("✅ WebSocket Connected via Gateway");
    onConnected(stompClient);
  };

  stompClient.onStompError = (frame) => {
    console.error("❌ Broker reported error: " + frame.headers['message']);
    console.error("Additional details: " + frame.body);
  };

  stompClient.onWebSocketClose = () => {
    console.warn("⚠️ WebSocket connection closed");
  };

  stompClient.activate();
}

export function disconnectWebSocket() {
  if (stompClient) {
    console.log("🔌 Deactivating WebSocket...");
    stompClient.deactivate();
    stompClient = null;
  }
}
