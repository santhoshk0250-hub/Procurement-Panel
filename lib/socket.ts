// /src/lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const url = "https://tytfaceserver.duckdns.org"

  socket = io(url, {
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    transports: ["polling", "websocket"], // allow fallback like the demo CDN client
  });

  // Base diagnostics (optional)
  socket.on("connect", () => console.log("[socket] connected:", socket?.id));
  socket.on("disconnect", (reason) => console.log("[socket] disconnected:", reason));
  socket.on("connect_error", (err) => {
    console.error("[socket] connect_error:", err?.message ?? err);
  });

  return socket;
}
