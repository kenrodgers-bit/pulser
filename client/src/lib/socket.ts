import { io, type Socket } from "socket.io-client";

import { isRealtimeConfigured, realtimeOrigin } from "@/lib/runtimeConfig";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!isRealtimeConfigured || !realtimeOrigin) {
    return null;
  }

  if (!socket) {
    socket = io(realtimeOrigin, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket"],
    });
  }

  return socket;
};
