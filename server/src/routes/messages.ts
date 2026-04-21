import { Router } from "express";
import { body } from "express-validator";

import {
  createMessage,
  deleteMessage,
  editMessage,
  getChannelMessages,
  getChatMessages,
  markMessagesRead,
  openViewOnceMedia,
  reactToMessage,
} from "../controllers/messagesController";
import { requireAuth } from "../middleware/authMiddleware";
import { mediaUpload } from "../middleware/upload";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.use(requireAuth);

// GET /api/messages/chat/:chatId - Fetch recent messages for a DM or group chat.
router.get("/chat/:chatId", getChatMessages);

// GET /api/messages/channel/:channelId - Fetch recent channel posts/comments.
router.get("/channel/:channelId", getChannelMessages);

// POST /api/messages - Send a new text or media message to a chat or channel.
router.post(
  "/",
  mediaUpload.single("file"),
  body("chatId").optional().isString().notEmpty(),
  body("channelId").optional().isString().notEmpty(),
  body("type").optional().isString().trim().isLength({ max: 20 }),
  body("content").optional().isString().trim().isLength({ max: 5000 }),
  body("viewMode").optional().isIn(["once", "unlimited"]),
  validateRequest,
  createMessage,
);

// POST /api/messages/:messageId/open - Open a view-once media message.
router.post("/:messageId/open", openViewOnceMedia);

// PATCH /api/messages/:messageId - Edit an existing text message.
router.patch(
  "/:messageId",
  body("content").isString().trim().isLength({ min: 1, max: 5000 }),
  validateRequest,
  editMessage,
);

// DELETE /api/messages/:messageId - Delete a message for the current user or everyone.
router.delete(
  "/:messageId",
  body("mode").optional().isIn(["me", "everyone"]),
  validateRequest,
  deleteMessage,
);

// POST /api/messages/:messageId/reactions - Add or replace an emoji reaction.
router.post(
  "/:messageId/reactions",
  body("emoji").isString().trim().isLength({ min: 1, max: 8 }),
  validateRequest,
  reactToMessage,
);

// POST /api/messages/read - Mark one or more messages as read.
router.post(
  "/read",
  body("messageIds").isArray({ min: 1 }),
  validateRequest,
  markMessagesRead,
);

export default router;
