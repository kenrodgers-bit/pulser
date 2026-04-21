import { io, type Socket } from "socket.io-client";

const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i;
const configuredServerUrl = import.meta.env.VITE_SERVER_URL;
const configuredApiUrl = import.meta.env.VITE_API_URL;
const shouldUseDevProxy =
  import.meta.env.DEV &&
  (!configuredServerUrl || LOCAL_URL_PATTERN.test(configuredServerUrl)) &&
  (!configuredApiUrl || LOCAL_URL_PATTERN.test(configuredApiUrl));

const serverUrl = shouldUseDevProxy
  ? window.location.origin
  : configuredServerUrl ||
    (configuredApiUrl || "http://localhost:4000/api").replace(/\/api$/, "");

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(serverUrl, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket"],
    });
  }

  return socket;
};
