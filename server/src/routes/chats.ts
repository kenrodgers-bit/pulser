import { Router } from "express";
import { body } from "express-validator";

import {
  addGroupMembers,
  createGroupChat,
  createOrGetDirectMessageChat,
  getChatById,
  getChats,
  getGroupInviteLink,
  joinGroupViaInvite,
  removeGroupMember,
  toggleMuteChat,
  togglePinMessage,
  updateGroupMemberRole,
  updateGroupChat,
} from "../controllers/chatsController";
import { requireAuth } from "../middleware/authMiddleware";
import { avatarUpload } from "../middleware/upload";
import { validateRequest } from "../middleware/validateRequest";

const router = Router();

router.use(requireAuth);

// GET /api/chats - Fetch the current user's DM and group chats.
router.get("/", getChats);

// POST /api/chats/direct - Create or fetch a one-on-one chat.
router.post(
  "/direct",
  body("participantId").isString().notEmpty(),
  validateRequest,
  createOrGetDirectMessageChat,
);

// POST /api/chats/groups - Create a new group chat.
router.post(
  "/groups",
  avatarUpload.single("avatar"),
  body("groupName").isString().trim().isLength({ min: 2, max: 60 }),
  body("groupDescription").optional().isString().trim().isLength({ max: 240 }),
  validateRequest,
  createGroupChat,
);

// GET /api/chats/:chatId - Fetch chat metadata and pinned messages.
router.get("/:chatId", getChatById);

// PUT /api/chats/:chatId - Update a group chat's name, avatar, or description.
router.put(
  "/:chatId",
  avatarUpload.single("avatar"),
  body("groupName").optional().isString().trim().isLength({ min: 2, max: 60 }),
  body("groupDescription").optional().isString().trim().isLength({ max: 240 }),
  validateRequest,
  updateGroupChat,
);

// POST /api/chats/:chatId/members - Add members to a group chat.
router.post("/:chatId/members", addGroupMembers);

// DELETE /api/chats/:chatId/members/:memberId - Remove a member from a group chat.
router.delete("/:chatId/members/:memberId", removeGroupMember);

// PATCH /api/chats/:chatId/members/:memberId/role - Promote or demote a member.
router.patch(
  "/:chatId/members/:memberId/role",
  body("role").isIn(["admin", "member"]),
  validateRequest,
  updateGroupMemberRole,
);

// POST /api/chats/:chatId/mute - Toggle mute for the current chat.
router.post("/:chatId/mute", toggleMuteChat);

// GET /api/chats/:chatId/invite-link - Generate or fetch a group invite link.
router.get("/:chatId/invite-link", getGroupInviteLink);

// POST /api/chats/invite/:inviteCode - Join a group chat using an invite code.
router.post("/invite/:inviteCode", joinGroupViaInvite);

// POST /api/chats/:chatId/pin/:messageId - Pin or unpin a message in a chat.
router.post("/:chatId/pin/:messageId", togglePinMessage);

export default router;
