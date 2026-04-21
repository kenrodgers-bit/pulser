import { Router } from "express";
import { body, query } from "express-validator";

import {
  acceptFriendRequest,
  checkUsernameAvailability,
  deletePushSubscription,
  getFriendRequests,
  getFriends,
  getPushSubscriptions,
  rejectFriendRequest,
  savePushSubscription,
  searchUsers,
  sendFriendRequest,
  updateUsername,
} from "../controllers/usersController";
import { requireAuth } from "../middleware/authMiddleware";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.use(requireAuth);

// GET /api/users/search - Search users by username.
router.get(
  "/search",
  query("q").optional().isString().trim().isLength({ max: 32 }),
  validateRequest,
  searchUsers,
);

// GET /api/users/friends - Fetch the authenticated user's friends list.
router.get("/friends", getFriends);

// GET /api/users/username-availability - Check whether a username is available.
router.get(
  "/username-availability",
  query("username").isString().trim().isLength({ min: 1, max: 24 }),
  validateRequest,
  checkUsernameAvailability,
);

// PATCH /api/users/username - Set or update the current user's username.
router.patch(
  "/username",
  body("username").isString().trim().isLength({ min: 3, max: 24 }),
  validateRequest,
  updateUsername,
);

// GET /api/users/friend-requests - Fetch pending incoming and outgoing requests.
router.get("/friend-requests", getFriendRequests);

// POST /api/users/friend-requests/:userId - Send a friend request to another user.
router.post("/friend-requests/:userId", sendFriendRequest);

// POST /api/users/friend-requests/:userId/accept - Accept an incoming friend request.
router.post("/friend-requests/:userId/accept", acceptFriendRequest);

// POST /api/users/friend-requests/:userId/reject - Reject an incoming friend request.
router.post("/friend-requests/:userId/reject", rejectFriendRequest);

// POST /api/users/push-subscriptions - Save a Web Push subscription for this browser.
router.post(
  "/push-subscriptions",
  body("subscription.endpoint").isString().notEmpty(),
  body("subscription.keys.p256dh").isString().notEmpty(),
  body("subscription.keys.auth").isString().notEmpty(),
  validateRequest,
  savePushSubscription,
);

// GET /api/users/push-subscriptions - List saved Web Push subscriptions for the current user.
router.get("/push-subscriptions", getPushSubscriptions);

// DELETE /api/users/push-subscriptions - Remove a Web Push subscription by endpoint or clear all.
router.delete("/push-subscriptions", deletePushSubscription);

export default router;
