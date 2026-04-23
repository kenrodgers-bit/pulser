import fs from "node:fs";
import path from "node:path";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import type { Server as SocketIOServer } from "socket.io";

import { connectToDatabase } from "./config/database";
import { env, getEnvironmentIssues } from "./config/env";
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
import { AppError } from "./utils/http";

const publicIndexPath = path.resolve(process.cwd(), "public", "index.html");

const localOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

export const getAllowedOriginList = () =>
  Array.from(new Set([env.clientUrl, ...localOrigins].filter(Boolean)));

const vercelPreviewMatcher = (() => {
  try {
    const hostname = new URL(env.clientUrl).hostname;

    if (!hostname.endsWith(".vercel.app")) {
      return null;
    }

    const deploymentPrefix = hostname.replace(/\.vercel\.app$/i, "");

    return (origin: string) => {
      try {
        const originUrl = new URL(origin);

        return (
          originUrl.protocol === "https:" &&
          originUrl.hostname.endsWith(".vercel.app") &&
          (originUrl.hostname === hostname ||
            originUrl.hostname.startsWith(`${deploymentPrefix}-`))
        );
      } catch {
        return false;
      }
    };
  } catch {
    return null;
  }
})();

const isAllowedOrigin = (origin: string) =>
  getAllowedOriginList().includes(origin) || Boolean(vercelPreviewMatcher?.(origin));

const resolveCorsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => {
  if (!origin || isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by Pulse CORS.`));
};

let readinessPromise: Promise<void> | null = null;

export const ensureAppReady = async () => {
  if (!readinessPromise) {
    readinessPromise = (async () => {
      const environmentIssues = getEnvironmentIssues();

      if (environmentIssues.length > 0) {
        throw new Error(
          `Pulse server environment is incomplete:\n- ${environmentIssues.join("\n- ")}`,
        );
      }

      await connectToDatabase();
    })().catch((error) => {
      readinessPromise = null;
      throw error;
    });
  }

  await readinessPromise;
};

type PulseAppOptions = {
  initialize?: () => Promise<void>;
  io?: SocketIOServer;
  serveClientShell?: boolean;
};

export const createPulseApp = ({
  initialize,
  io,
  serveClientShell = false,
}: PulseAppOptions = {}) => {
  const app = express();
  const usePassportSession = Boolean(env.google.clientId && env.google.clientSecret);

  if (io) {
    app.set("io", io);
  }

  app.set("trust proxy", env.isProduction ? 1 : false);

  if (initialize) {
    app.use(["/health", "/api"], async (_req, _res, next) => {
      try {
        await initialize();
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  app.use(
    cors({
      origin: resolveCorsOrigin,
      credentials: true,
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (usePassportSession) {
    app.use(
      session({
        secret: env.sessionSecret,
        proxy: env.isProduction,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: env.isProduction,
          sameSite: env.isProduction ? "none" : "lax",
          maxAge: 10 * 60 * 1000,
        },
      }),
    );
  }

  app.use(passport.initialize());

  if (usePassportSession) {
    app.use(passport.session());
  }

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

  if (serveClientShell) {
    app.get(/^\/(?!api(?:\/|$)|health$).*/, (req, res, next) => {
      if (path.extname(req.path)) {
        next();
        return;
      }

      if (!fs.existsSync(publicIndexPath)) {
        next(
          new AppError(
            "Pulse frontend build is missing. Run the client build before starting the integrated app.",
            500,
          ),
        );
        return;
      }

      res.sendFile(publicIndexPath, (error) => {
        if (error) {
          next(error);
        }
      });
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  if (io) {
    registerSocketHandlers(io);
  }

  return app;
};
