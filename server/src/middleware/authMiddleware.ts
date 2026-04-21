import type { NextFunction, Request, Response } from "express";

import { User } from "../models/User";
import { verifyAccessToken } from "../utils/tokenUtils";

const extractBearerToken = (req: Request) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7);
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.accessToken ?? extractBearerToken(req);

    if (!token) {
      res.status(401).json({ ok: false, message: "Authentication required." });
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      res.status(401).json({ ok: false, message: "User not found." });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (_error) {
    res.status(401).json({ ok: false, message: "Invalid or expired session." });
  }
};
