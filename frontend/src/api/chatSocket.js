import { io } from "socket.io-client";

export const chatSocket = io(window.location.origin, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: true,
});
