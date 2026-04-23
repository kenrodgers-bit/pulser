import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "server", ".env"),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
  }
}

const DEFAULTS = {
  nodeEnv: "development",
  port: 4000,
  clientUrl: "http://localhost:5173",
  mongodbUri: "mongodb://127.0.0.1:27017/pulse-app",
  sessionSecret: "pulse-dev-session-secret",
  accessTokenSecret: "pulse-dev-access-secret",
  refreshTokenSecret: "pulse-dev-refresh-secret",
  googleCallbackUrl: "http://localhost:4000/api/auth/google/callback",
  webPushSubject: "mailto:hello@pulse.app",
} as const;

const trimValue = (value?: string) => value?.trim() ?? "";
const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const normalizeAbsoluteUrl = (value: string, fallback: string) => {
  const candidate = stripTrailingSlash(trimValue(value));

  if (!candidate) {
    return fallback;
  }

  try {
    return stripTrailingSlash(new URL(candidate).toString());
  } catch {
    return fallback;
  }
};
const normalizeOrigin = (value: string, fallback: string) => {
  const candidate = normalizeAbsoluteUrl(value, fallback);
  return new URL(candidate).origin;
};
const countConfiguredValues = (values: string[]) => values.filter(Boolean).length;

type RequestLike = {
  protocol?: string;
  get: (name: string) => string | undefined;
};

const isProduction = process.env.NODE_ENV === "production";
const parsedPort = Number(trimValue(process.env.PORT) || DEFAULTS.port);

export const env = {
  nodeEnv: trimValue(process.env.NODE_ENV) || DEFAULTS.nodeEnv,
  isProduction,
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULTS.port,
  clientUrl: normalizeOrigin(process.env.CLIENT_URL ?? "", DEFAULTS.clientUrl),
  sessionSecret: trimValue(process.env.SESSION_SECRET) || DEFAULTS.sessionSecret,
  mongodbUri: trimValue(process.env.MONGODB_URI) || DEFAULTS.mongodbUri,
  accessTokenSecret:
    trimValue(process.env.JWT_ACCESS_SECRET) || DEFAULTS.accessTokenSecret,
  refreshTokenSecret:
    trimValue(process.env.JWT_REFRESH_SECRET) || DEFAULTS.refreshTokenSecret,
  accessTokenTtl: trimValue(process.env.JWT_ACCESS_TTL) || "15m",
  refreshTokenTtl: trimValue(process.env.JWT_REFRESH_TTL) || "7d",
  cookieDomain: trimValue(process.env.COOKIE_DOMAIN) || undefined,
  google: {
    clientId: trimValue(process.env.GOOGLE_CLIENT_ID),
    clientSecret: trimValue(process.env.GOOGLE_CLIENT_SECRET),
    callbackUrl:
      normalizeAbsoluteUrl(
        process.env.GOOGLE_CALLBACK_URL ?? "",
        DEFAULTS.googleCallbackUrl,
      ),
  },
  cloudinary: {
    cloudName: trimValue(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey: trimValue(process.env.CLOUDINARY_API_KEY),
    apiSecret: trimValue(process.env.CLOUDINARY_API_SECRET),
  },
  webPush: {
    publicKey: trimValue(process.env.WEB_PUSH_PUBLIC_KEY),
    privateKey: trimValue(process.env.WEB_PUSH_PRIVATE_KEY),
    subject: trimValue(process.env.WEB_PUSH_SUBJECT) || DEFAULTS.webPushSubject,
  },
};

export const getEnvironmentIssues = () => {
  const issues: string[] = [];

  if (!isProduction) {
    return issues;
  }

  if (!trimValue(process.env.CLIENT_URL)) {
    issues.push("CLIENT_URL must be set to your frontend origin in production.");
  }

  if (!trimValue(process.env.MONGODB_URI)) {
    issues.push("MONGODB_URI must be set in production.");
  }

  if (env.accessTokenSecret === DEFAULTS.accessTokenSecret) {
    issues.push("JWT_ACCESS_SECRET must be set to a non-default value in production.");
  }

  if (env.refreshTokenSecret === DEFAULTS.refreshTokenSecret) {
    issues.push("JWT_REFRESH_SECRET must be set to a non-default value in production.");
  }

  if (env.sessionSecret === DEFAULTS.sessionSecret) {
    issues.push("SESSION_SECRET must be set to a non-default value in production.");
  }

  if (trimValue(process.env.PORT) && env.port === DEFAULTS.port && process.env.PORT !== "4000") {
    issues.push("PORT must be a valid positive integer.");
  }

  const googleConfiguredCount = countConfiguredValues([
    env.google.clientId,
    env.google.clientSecret,
  ]);

  if (googleConfiguredCount === 1) {
    issues.push("Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in.");
  }

  if (googleConfiguredCount === 2 && !trimValue(process.env.GOOGLE_CALLBACK_URL)) {
    issues.push("GOOGLE_CALLBACK_URL must be set in production when Google sign-in is enabled.");
  }

  const cloudinaryConfiguredCount = countConfiguredValues([
    env.cloudinary.cloudName,
    env.cloudinary.apiKey,
    env.cloudinary.apiSecret,
  ]);

  if (cloudinaryConfiguredCount > 0 && cloudinaryConfiguredCount < 3) {
    issues.push(
      "Set all Cloudinary variables together or leave them all unset to disable uploads.",
    );
  }

  const webPushConfiguredCount = countConfiguredValues([
    env.webPush.publicKey,
    env.webPush.privateKey,
    trimValue(process.env.WEB_PUSH_SUBJECT),
  ]);

  if (webPushConfiguredCount > 0 && webPushConfiguredCount < 3) {
    issues.push(
      "Set all Web Push variables together or leave them all unset to disable push notifications.",
    );
  }

  return issues;
};

export const resolveRequestOrigin = (request?: RequestLike | null) => {
  const host = request?.get("host")?.trim();

  if (!host) {
    return null;
  }

  const forwardedProto = request
    ?.get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = forwardedProto || request?.protocol || "https";

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
};

export const resolveClientUrl = (path = "/", request?: RequestLike | null) => {
  const origin = resolveRequestOrigin(request) ?? env.clientUrl;
  return new URL(path.startsWith("/") ? path : `/${path}`, `${origin}/`).toString();
};
