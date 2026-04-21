import http from "node:http";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import { Server as SocketIOServer } from "socket.io";

import { connectToDatabase } from "./config/database";
import { env } from "./config/env";
import "./config/passport";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sanitizeRequestInput } from "./middleware/sanitizeInput";
import authRoutes from "./routes/auth";
import channelRoutes from "./routes/channels";
import chatRoutes from "./routes/chats";
import mediaRoutes from "./routes/media";
import messageRoutes from "./routes/messages";
import notificationRoutes from "./routes/notifications";
import storyRoutes from "./routes/stories";
import userRoutes from "./routes/users";
import { registerSocketHandlers } from "./socket/socketHandlers";

const allowedOrigins = Array.from(
  new Set(
    [
      env.clientUrl,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ].filter(Boolean),
  ),
);

const resolveCorsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by Pulse CORS.`));
};

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);

app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: true,
  }),
);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.isProduction,
      sameSite: env.isProduction ? "none" : "lax",
      maxAge: 10 * 60 * 1000,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.use(sanitizeRequestInput);
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "pulse-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

registerSocketHandlers(io);

const start = async () => {
  await connectToDatabase();

  httpServer.listen(env.port, () => {
    console.log(`Pulse server listening on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start Pulse server", error);
  process.exit(1);
});
