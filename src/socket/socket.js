import { io } from "socket.io-client";

export const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

// Create socket but do NOT auto-connect — token isn't available until after login
export const socket = io(SOCKET_URL, {
  autoConnect: false
});

/**
 * Call this after a successful login so the token is
 * set on the socket BEFORE it connects.
 */
export function connectSocket() {
  const token = localStorage.getItem("token");
  socket.auth = { token };
  if (!socket.connected) {
    socket.connect();
  }
}

/**
 * Call this on logout to cleanly disconnect.
 */
export function disconnectSocket() {
  socket.disconnect();
}
