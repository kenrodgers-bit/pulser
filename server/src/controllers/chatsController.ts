import { nanoid } from "nanoid";

import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { User } from "../models/User";
import { validateUploadedFile } from "../middleware/upload";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";
import { asyncHandler } from "../utils/asyncHandler";
import { getOrCreateDirectChat } from "../utils/chatHelpers";
import { AppError, sendSuccess } from "../utils/http";
import { serializeChat, serializeMessage } from "../utils/serializers";

const ensureGroupAdmin = (chat: any, userId: string) => {
  const isAdmin =
    chat.ownerId?.toString() === userId ||
    chat.admins.some((adminId: any) => adminId.toString() === userId);

  if (!isAdmin) {
    throw new AppError("You must be a group admin to do that.", 403);
  }
};

const parseMemberIds = (value: unknown) => {
  if (!value) {
    return [] as string[];
  }

  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
};

export const getChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({
    participants: req.user!._id,
  })
    .populate("participants", "username displayName avatarUrl")
    .sort({ updatedAt: -1 });

  sendSuccess(res, {
    chats: chats.map((chat) => serializeChat(chat)),
  });
});

export const getChatById = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId).populate(
    "participants",
    "username displayName avatarUrl",
  );

  if (!chat) {
    throw new AppError("Chat not found.", 404);
  }

  if (
    !chat.participants.some(
      (participant: any) => participant._id.toString() === req.userId,
    )
  ) {
    throw new AppError("You do not have access to this chat.", 403);
  }

  const pinnedMessages = await Message.find({
    _id: { $in: chat.pinnedMessages },
  })
    .populate("senderId", "username displayName avatarUrl")
    .sort({ createdAt: -1 });

  sendSuccess(res, {
    chat: serializeChat(chat),
    pinnedMessages: pinnedMessages
      .map((message) => serializeMessage(message, req.userId!))
      .filter(Boolean),
  });
});

export const createOrGetDirectMessageChat = asyncHandler(async (req, res) => {
  const { participantId } = req.body;

  if (!participantId || participantId === req.userId) {
    throw new AppError("A valid participant is required.");
  }

  const participant = await User.findById(participantId);

  if (!participant) {
    throw new AppError("User not found.", 404);
  }

  const chat = await getOrCreateDirectChat(req.userId!, participantId);
  await chat.populate("participants", "username displayName avatarUrl");

  sendSuccess(res, { chat: serializeChat(chat) }, 201);
});

export const createGroupChat = asyncHandler(async (req, res) => {
  const memberIds = [...new Set(parseMemberIds(req.body.memberIds))].filter(
    (memberId) => memberId !== req.userId,
  );

  if (!req.body.groupName) {
    throw new AppError("Group name is required.");
  }

  let groupAvatar = "";
  let groupAvatarPublicId = "";

  if (req.file) {
    validateUploadedFile(req.file);
    const upload = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "pulse/group-avatars",
      resourceType: "image",
      filename: `${req.body.groupName}-${Date.now()}`,
    });
    groupAvatar = upload.secure_url;
    groupAvatarPublicId = upload.public_id;
  }

  const chat = await Chat.create({
    participants: [req.user!._id, ...memberIds],
    isGroup: true,
    groupName: req.body.groupName,
    groupDescription: req.body.groupDescription ?? "",
    groupAvatar,
    groupAvatarPublicId,
    admins: [req.user!._id],
    ownerId: req.user!._id,
    inviteCode: nanoid(12),
  });

  await chat.populate("participants", "username displayName avatarUrl");

  sendSuccess(res, { chat: serializeChat(chat) }, 201);
});

export const updateGroupChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);

  if (!chat || !chat.isGroup) {
    throw new AppError("Group chat not found.", 404);
  }

  ensureGroupAdmin(chat, req.userId!);

  if (req.file) {
    validateUploadedFile(req.file);
    const upload = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "pulse/group-avatars",
      resourceType: "image",
      filename: `${chat.groupName}-${Date.now()}`,
    });

    chat.groupAvatar = upload.secure_url;
    chat.groupAvatarPublicId = upload.public_id;
  }

  if (req.body.groupName) {
    chat.groupName = req.body.groupName;
  }

  if (typeof req.body.groupDescription === "string") {
    chat.groupDescription = req.body.groupDescription;
  }

  await chat.save();
  await chat.populate("participants", "username displayName avatarUrl");

  sendSuccess(res, { chat: serializeChat(chat) });
});

export const addGroupMembers = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);

  if (!chat || !chat.isGroup) {
    throw new AppError("Group chat not found.", 404);
  }

  ensureGroupAdmin(chat, req.userId!);

  const memberIds = parseMemberIds(req.body.memberIds);

  for (const memberId of memberIds) {
    if (!chat.participants.some((participant: any) => participant.toString() === memberId)) {
      chat.participants.push(memberId as any);
    }
  }

  await chat.save();
  await chat.populate("participants", "username displayName avatarUrl");

  sendSuccess(res, { chat: serializeChat(chat) });
});

export const removeGroupMember = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  const memberId = req.params.memberId;

  if (!chat || !chat.isGroup) {
    throw new AppError("Group chat not found.", 404);
  }

  if (memberId !== req.userId) {
    ensureGroupAdmin(chat, req.userId!);
  }

  if (chat.ownerId?.toString() === memberId && memberId !== req.userId) {
    throw new AppError("Transfer ownership before removing the group owner.", 400);
  }

  chat.participants = chat.participants.filter(
    (participant: any) => participant.toString() !== memberId,
  ) as any;
  chat.admins = chat.admins.filter(
    (adminId: any) => adminId.toString() !== memberId,
  ) as any;
  chat.mutedBy = chat.mutedBy.filter(
    (userId: any) => userId.toString() !== memberId,
  ) as any;

  await chat.save();
  await chat.populate("participants", "username displayName avatarUrl");

  sendSuccess(res, { chat: serializeChat(chat) });
});

export const updateGroupMemberRole = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  const memberId = req.params.memberId;
  const role = req.body.role === "admin" ? "admin" : "member";

  if (!chat || !chat.isGroup) {
    throw new AppError("Group chat not found.", 404);
  }

  if (chat.ownerId?.toString() !== req.userId) {
    throw new AppError("Only the group owner can change admin roles.", 403);
  }

  if (!chat.participants.some((participant: any) => participant.toString() === memberId)) {
    throw new AppError("That user is not in this group.", 404);
  }

  if (chat.ownerId?.toString() === memberId) {
    throw new AppError("The owner role cannot be changed.", 400);
  }

  const isAdmin = chat.admins.some((adminId: any) => adminId.toString() === memberId);

  if (role === "admin" && !isAdmin) {
    chat.admins.push(memberId as any);
  }

  if (role === "member" && isAdmin) {
    chat.admins = chat.admins.filter(
      (adminId: any) => adminId.toString() !== memberId,
    ) as any;
  }

  await chat.save();
  await chat.populate("participants", "username displayName avatarUrl");

  sendSuccess(res, { chat: serializeChat(chat) });
});

export const toggleMuteChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);

  if (!chat) {
    throw new AppError("Chat not found.", 404);
  }

  const isMuted = chat.mutedBy.some((userId: any) => userId.toString() === req.userId);

  chat.mutedBy = isMuted
    ? (chat.mutedBy.filter((userId: any) => userId.toString() !== req.userId) as any)
    : ([...chat.mutedBy, req.user!._id] as any);

  await chat.save();

  sendSuccess(res, { muted: !isMuted });
});

export const getGroupInviteLink = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);

  if (!chat || !chat.isGroup) {
    throw new AppError("Group chat not found.", 404);
  }

  ensureGroupAdmin(chat, req.userId!);

  if (!chat.inviteCode) {
    chat.inviteCode = nanoid(12);
    await chat.save();
  }

  sendSuccess(res, {
    inviteCode: chat.inviteCode,
    inviteLink: `${process.env.CLIENT_URL ?? "http://localhost:5173"}/chat/${chat._id}?invite=${chat.inviteCode}`,
  });
});

export const joinGroupViaInvite = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({
    inviteCode: req.params.inviteCode,
    isGroup: true,
  }).populate("participants", "username displayName avatarUrl");

  if (!chat) {
    throw new AppError("Invite link is invalid.", 404);
  }

  if (!chat.participants.some((participant: any) => participant._id?.toString?.() === req.userId || participant.toString?.() === req.userId)) {
    chat.participants.push(req.user!._id);
    await chat.save();
    await chat.populate("participants", "username displayName avatarUrl");
  }

  sendSuccess(res, { chat: serializeChat(chat) });
});

export const togglePinMessage = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);

  if (!chat) {
    throw new AppError("Chat not found.", 404);
  }

  if (
    !chat.participants.some(
      (participant: any) => participant.toString() === req.userId,
    )
  ) {
    throw new AppError("You do not have access to this chat.", 403);
  }

  const messageId = req.params.messageId;
  const isPinned = chat.pinnedMessages.some(
    (pinnedMessageId: any) => pinnedMessageId.toString() === messageId,
  );

  chat.pinnedMessages = isPinned
    ? (chat.pinnedMessages.filter(
        (pinnedMessageId: any) => pinnedMessageId.toString() !== messageId,
      ) as any)
    : ([...chat.pinnedMessages, messageId] as any);

  await chat.save();

  sendSuccess(res, {
    pinned: !isPinned,
    pinnedMessages: chat.pinnedMessages.map((id: any) => id.toString()),
  });
});
