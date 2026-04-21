import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  sessionSecret: process.env.SESSION_SECRET ?? "pulse-dev-session-secret",
  mongodbUri:
    process.env.MONGODB_URI ??
    "mongodb://127.0.0.1:27017/pulse-app",
  accessTokenSecret:
    process.env.JWT_ACCESS_SECRET ?? "pulse-dev-access-secret",
  refreshTokenSecret:
    process.env.JWT_REFRESH_SECRET ?? "pulse-dev-refresh-secret",
  accessTokenTtl: process.env.JWT_ACCESS_TTL ?? "15m",
  refreshTokenTtl: process.env.JWT_REFRESH_TTL ?? "7d",
  cookieDomain: process.env.COOKIE_DOMAIN,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      "http://localhost:4000/api/auth/google/callback",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },
  webPush: {
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY ?? "",
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY ?? "",
    subject: process.env.WEB_PUSH_SUBJECT ?? "mailto:hello@pulse.app",
  },
};
