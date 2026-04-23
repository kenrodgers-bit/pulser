import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { Types } from "mongoose";

import { env, resolveClientUrl } from "../config/env";
import { Channel } from "../models/Channel";
import { Chat } from "../models/Chat";
import { User } from "../models/User";
import { validateUploadedFile } from "../middleware/upload";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError, sendSuccess } from "../utils/http";
import { serializeUser } from "../utils/serializers";
import {
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  generateRefreshTokenId,
  parseExpiryToMs,
  setAuthCookies,
  verifyRefreshToken,
} from "../utils/tokenUtils";

export const issueUserSession = async (
  user: any,
  req: Request,
  res: Response,
) => {
  const now = Date.now();
  const activeTokens = user.refreshTokens
    .filter((token: any) => token.expiresAt.getTime() > now)
    .slice(-4)
    .map((token: any) => ({
      tokenId: token.tokenId,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
    }));

  user.set("refreshTokens", activeTokens);

  const tokenId = generateRefreshTokenId();

  user.refreshTokens.push({
    tokenId,
    expiresAt: new Date(now + parseExpiryToMs(env.refreshTokenTtl)),
    userAgent: req.get("user-agent") ?? "",
    ipAddress: req.ip,
  });

  await user.save();

  const accessToken = createAccessToken({
    id: user._id.toString(),
    email: user.email,
    username: user.username,
  });
  const refreshToken = createRefreshToken(
    {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    },
    tokenId,
  );

  setAuthCookies(res, accessToken, refreshToken);

  return serializeUser(user, user._id.toString());
};

export const register = asyncHandler(async (req, res) => {
  const { username, displayName, email, password } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (existingUser) {
    throw new AppError("A user with that email or username already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    username: username.toLowerCase(),
    displayName,
    email: email.toLowerCase(),
    passwordHash,
    authProvider: "local",
  });

  const sessionUser = await issueUserSession(user as any, req, res);

  sendSuccess(res, { user: sessionUser }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
    ],
  }).select("+passwordHash");

  if (!user) {
    throw new AppError("Invalid credentials.", 401);
  }

  if (!user.passwordHash) {
    throw new AppError("This account uses Google sign-in.", 400);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid credentials.", 401);
  }

  const sessionUser = await issueUserSession(user as any, req, res);

  sendSuccess(res, { user: sessionUser });
});

export const refreshSession = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new AppError("Refresh token missing.", 401);
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.userId);

  if (!user) {
    throw new AppError("Session user not found.", 401);
  }

  const tokenIndex = user.refreshTokens.findIndex(
    (token) =>
      token.tokenId === payload.tokenId && token.expiresAt.getTime() > Date.now(),
  );

  if (tokenIndex === -1) {
    clearAuthCookies(res);
    throw new AppError("Refresh token expired or revoked.", 401);
  }

  user.refreshTokens.splice(tokenIndex, 1);
  const sessionUser = await issueUserSession(user as any, req, res);

  sendSuccess(res, { user: sessionUser });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await User.updateOne(
        { _id: payload.userId },
        { $pull: { refreshTokens: { tokenId: payload.tokenId } } },
      );
    } catch {
      // Ignore invalid refresh tokens during logout.
    }
  }

  clearAuthCookies(res);
  sendSuccess(res, { message: "Logged out." });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: serializeUser(req.user, req.userId) });
});

export const completeGoogleAuth = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError("Google authentication failed.", 401);
  }

  await issueUserSession(req.user, req, res);
  res.redirect(resolveClientUrl("/auth/success", req));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { displayName, bio, username } = req.body;

  if (username && username.toLowerCase() !== user.username) {
    const conflict = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: user._id },
    });

    if (conflict) {
      throw new AppError("That username is already taken.", 409);
    }
  }

  if (req.file) {
    validateUploadedFile(req.file);
    const upload = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "pulse/avatars",
      resourceType: "image",
      filename: `${user.username}-avatar`,
    });

    user.avatarUrl = upload.secure_url;
    user.avatarPublicId = upload.public_id;
  }

  if (displayName) {
    user.displayName = displayName;
  }

  if (typeof bio === "string") {
    user.bio = bio;
  }

  if (username) {
    user.username = username.toLowerCase();
  }

  if (req.body.privacy) {
    const privacy =
      typeof req.body.privacy === "string"
        ? JSON.parse(req.body.privacy)
        : req.body.privacy;
    user.privacy = {
      ...user.privacy,
      ...privacy,
    };
  }

  if (req.body.notificationSettings) {
    const notificationSettings =
      typeof req.body.notificationSettings === "string"
        ? JSON.parse(req.body.notificationSettings)
        : req.body.notificationSettings;

    user.notificationSettings = {
      ...user.notificationSettings,
      ...notificationSettings,
    };
  }

  await user.save();

  sendSuccess(res, { user: serializeUser(user, user._id.toString()) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select("+passwordHash");
  const { currentPassword, newPassword } = req.body;

  if (!user) {
    throw new AppError("User not found.", 404);
  }

  if (!user.passwordHash) {
    throw new AppError(
      "This account uses Google sign-in. Add a password after logging in.",
      400,
    );
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Current password is incorrect.", 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.set("refreshTokens", []);
  await user.save();

  clearAuthCookies(res);
  sendSuccess(res, { message: "Password updated. Please sign in again." });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.userId!;

  await Promise.all([
    User.findByIdAndDelete(userId),
    Chat.updateMany(
      { participants: new Types.ObjectId(userId) },
      {
        $pull: {
          participants: new Types.ObjectId(userId),
          admins: new Types.ObjectId(userId),
          mutedBy: new Types.ObjectId(userId),
        },
      },
    ),
    Channel.updateMany(
      { members: new Types.ObjectId(userId) },
      {
        $pull: {
          members: new Types.ObjectId(userId),
          admins: new Types.ObjectId(userId),
          mutedBy: new Types.ObjectId(userId),
        },
      },
    ),
  ]);

  clearAuthCookies(res);
  sendSuccess(res, { message: "Account deleted." });
});
