import http from "node:http";

import { Server as SocketIOServer } from "socket.io";

import { createPulseApp, ensureAppReady, getAllowedOriginList } from "./app";
import { env } from "./config/env";
import { registerSocketHandlers } from "./socket/socketHandlers";

const app = createPulseApp();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: getAllowedOriginList(),
    credentials: true,
  },
});

app.set("io", io);
registerSocketHandlers(io);

const start = async () => {
  await ensureAppReady();

  httpServer.listen(env.port, () => {
    console.log(
      env.isProduction
        ? `Pulse server listening on port ${env.port}`
        : `Pulse server listening on http://localhost:${env.port}`,
    );
  });
};

start().catch((error) => {
  console.error("Failed to start Pulse server", error);
  process.exit(1);
});
