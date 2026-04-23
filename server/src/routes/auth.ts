import { Router, type RequestHandler } from "express";
import { body } from "express-validator";
import passport from "passport";

import { env, resolveClientUrl } from "../config/env";
import {
  changePassword,
  completeGoogleAuth,
  deleteAccount,
  getCurrentUser,
  login,
  logout,
  refreshSession,
  register,
  updateProfile,
} from "../controllers/authController";
import { requireAuth } from "../middleware/authMiddleware";
import { authLimiter } from "../middleware/rateLimiter";
import { avatarUpload } from "../middleware/upload";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();
const ensureGoogleAuthEnabled: RequestHandler = (req, res, next) => {
  if (!env.google.clientId || !env.google.clientSecret) {
    res.redirect(resolveClientUrl("/auth?error=google_unavailable", req));
    return;
  }

  next();
};

// GET /api/auth/google - Redirect to Google's OAuth consent screen.
router.get(
  "/google",
  ensureGoogleAuthEnabled,
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

// GET /api/auth/google/callback - Complete Google OAuth, issue JWT cookies, and redirect to the client.
router.get(
  "/google/callback",
  ensureGoogleAuthEnabled,
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/google/failure",
  }),
  completeGoogleAuth,
);

// GET /api/auth/google/failure - Redirect failed Google OAuth attempts back to the auth page.
router.get("/google/failure", (req, res) => {
  res.redirect(resolveClientUrl("/auth?error=google_failed", req));
});

// POST /api/auth/register - Create an account and issue access/refresh cookies.
router.post(
  "/register",
  authLimiter,
  body("username").isString().trim().isLength({ min: 3, max: 24 }),
  body("displayName").isString().trim().isLength({ min: 2, max: 40 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8, max: 64 }),
  validateRequest,
  register,
);

// POST /api/auth/login - Sign in with email or username and rotate refresh tokens.
router.post(
  "/login",
  authLimiter,
  body("identifier").isString().trim().notEmpty(),
  body("password").isString().isLength({ min: 8, max: 64 }),
  validateRequest,
  login,
);

// POST /api/auth/refresh - Rotate the refresh token and set a new access token cookie.
router.post("/refresh", refreshSession);

// POST /api/auth/logout - Revoke the current refresh token and clear cookies.
router.post("/logout", logout);

// GET /api/auth/me - Fetch the current authenticated user profile.
router.get("/me", requireAuth, getCurrentUser);

// PUT /api/auth/profile - Update display name, bio, avatar, and privacy settings.
router.put(
  "/profile",
  requireAuth,
  avatarUpload.single("avatar"),
  body("displayName").optional().isString().trim().isLength({ min: 2, max: 40 }),
  body("bio").optional().isString().trim().isLength({ max: 180 }),
  body("username").optional().isString().trim().isLength({ min: 3, max: 24 }),
  validateRequest,
  updateProfile,
);

// PUT /api/auth/password - Change the current user's password and clear sessions.
router.put(
  "/password",
  requireAuth,
  body("currentPassword").isString().isLength({ min: 8, max: 64 }),
  body("newPassword").isString().isLength({ min: 8, max: 64 }),
  validateRequest,
  changePassword,
);

// DELETE /api/auth/account - Delete the current account.
router.delete("/account", requireAuth, deleteAccount);

export default router;
