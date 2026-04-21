import crypto from "node:crypto";

import type { Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

type TokenUser = {
  id: string;
  email: string;
  username: string;
};

export type AccessTokenPayload = {
  userId: string;
  email: string;
  username: string;
};

export type RefreshTokenPayload = AccessTokenPayload & {
  tokenId: string;
};

export const parseExpiryToMs = (value: string) => {
  const match = value.match(/^(\d+)([smhd])$/i);

  if (!match) {
    return 15 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier =
    unit === "s"
      ? 1000
      : unit === "m"
        ? 60 * 1000
        : unit === "h"
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

  return amount * multiplier;
};

const cookieOptions = (ttl: string) => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? ("none" as const) : ("lax" as const),
  domain: env.cookieDomain,
  maxAge: parseExpiryToMs(ttl),
  path: "/",
});

export const generateRefreshTokenId = () => crypto.randomUUID();

export const createAccessToken = (user: TokenUser) =>
  jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
    },
    env.accessTokenSecret,
    {
      expiresIn: env.accessTokenTtl as any,
    },
  );

export const createRefreshToken = (
  user: TokenUser,
  tokenId: string,
) =>
  jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
      tokenId,
    },
    env.refreshTokenSecret,
    {
      expiresIn: env.refreshTokenTtl as any,
    },
  );

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.accessTokenSecret) as AccessTokenPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.refreshTokenSecret) as RefreshTokenPayload;

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  res.cookie("accessToken", accessToken, cookieOptions(env.accessTokenTtl));
  res.cookie("refreshToken", refreshToken, cookieOptions(env.refreshTokenTtl));
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", cookieOptions(env.accessTokenTtl));
  res.clearCookie("refreshToken", cookieOptions(env.refreshTokenTtl));
};
