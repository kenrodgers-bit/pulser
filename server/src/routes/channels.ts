import { Router } from "express";
import { body, query } from "express-validator";

import {
  createChannel,
  discoverChannels,
  getChannelBySlug,
  getMyChannels,
  joinChannel,
  joinChannelViaInvite,
  leaveChannel,
  toggleMuteChannel,
  updateChannel,
} from "../controllers/channelsController";
import { requireAuth } from "../middleware/authMiddleware";
import { avatarUpload } from "../middleware/upload";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.use(requireAuth);

// GET /api/channels - Discover public channels.
router.get(
  "/",
  query("q").optional().isString().trim().isLength({ max: 40 }),
  validateRequest,
  discoverChannels,
);

// GET /api/channels/mine - Fetch channels the current user belongs to.
router.get("/mine", getMyChannels);

// POST /api/channels - Create a new public or private channel.
router.post(
  "/",
  avatarUpload.single("avatar"),
  body("name").isString().trim().isLength({ min: 2, max: 60 }),
  body("description").optional().isString().trim().isLength({ max: 240 }),
  body("visibility").optional().isIn(["public", "private"]),
  validateRequest,
  createChannel,
);

// GET /api/channels/:channelIdOrSlug - Fetch channel details.
router.get("/:channelIdOrSlug", getChannelBySlug);

// POST /api/channels/:channelId/join - Join a channel directly or with an invite code.
router.post("/:channelId/join", joinChannel);

// POST /api/channels/join - Join a private channel via invite code.
router.post(
  "/join",
  body("inviteCode").isString().trim().isLength({ min: 3 }),
  validateRequest,
  joinChannelViaInvite,
);

// POST /api/channels/:channelId/mute - Toggle mute for channel notifications.
router.post("/:channelId/mute", toggleMuteChannel);

// DELETE /api/channels/:channelId/membership - Leave a joined channel.
router.delete("/:channelId/membership", leaveChannel);

// PUT /api/channels/:channelId - Update channel settings and avatar.
router.put(
  "/:channelId",
  avatarUpload.single("avatar"),
  body("name").optional().isString().trim().isLength({ min: 2, max: 60 }),
  body("description").optional().isString().trim().isLength({ max: 240 }),
  body("visibility").optional().isIn(["public", "private"]),
  validateRequest,
  updateChannel,
);

export default router;
