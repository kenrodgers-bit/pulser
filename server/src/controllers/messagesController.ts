import type { Express } from "express";
import type { Server } from "socket.io";

import { Channel } from "../models/Channel";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { validateUploadedFile } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";
import { buildLastMessagePayload } from "../utils/chatHelpers";
import {
  buildMediaPreviewUrl,
  uploadBufferToCloudinary,
} from "../utils/cloudinaryUpload";
import { AppError, sendSuccess } from "../utils/http";
import { notifyUser } from "../utils/notifications";
import { serializeMessage } from "../utils/serializers";

type MessageInput = {
  userId: string;
  chatId?: string;
  channelId?: string;
  type?: string;
  content?: string;
  viewMode?: "once" | "unlimited";
  replyTo?: string | null;
  file?: Express.Multer.File;
};

const inferMessageType = (
  file?: Express.Multer.File,
  providedType?: string,
): "text" | "image" | "video" | "audio" | "file" | "sticker" | "emoji" => {
  if (providedType === "sticker" || providedType === "emoji") {
    return providedType;
  }

  if (!file) {
    return "text";
  }

  if (file.mimetype.startsWith("image/")) {
    return "image";
  }

  if (file.mimetype.startsWith("video/")) {
    return "video";
  }

  if (file.mimetype.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};

const ensureChatAccess = async (chatId: string, userId: string) => {
  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new AppError("Chat not found.", 404);
  }

  if (!chat.participants.some((participant) => participant.toString() === userId)) {
    throw new AppError("You do not have access to this chat.", 403);
  }

  return chat;
};

const ensureChannelAccess = async (channelId: string, userId: string, replyTo?: string | null) => {
  const channel = await Channel.findById(channelId);

  if (!channel) {
    throw new AppError("Channel not found.", 404);
  }

  if (!channel.members.some((member) => member.toString() === userId)) {
    throw new AppError("You must join this channel first.", 403);
  }

  const isAdmin =
    channel.ownerId.toString() === userId ||
    channel.admins.some((adminId) => adminId.toString() === userId);

  if (!replyTo && !isAdmin) {
    throw new AppError("Only channel admins can publish posts.", 403);
  }

  return channel;
};

export const populateMessageById = (messageId: string) =>
  Message.findById(messageId)
    .populate("senderId", "username displayName avatarUrl")
    .populate({
      path: "replyTo",
      select: "senderId content type",
    });

export const createMessageEntry = async (
  input: MessageInput,
) => {
  const type = inferMessageType(input.file, input.type);
  const viewMode =
    input.viewMode === "once" && (type === "image" || type === "video")
      ? "once"
      : "unlimited";

  let chat: any = null;
  let channel: any = null;
  let room = "";
  let mutedBy: string[] = [];
  let recipientIds: string[] = [];

  if (input.chatId) {
    chat = await ensureChatAccess(input.chatId, input.userId);
    room = `chat:${chat._id}`;
    mutedBy = chat.mutedBy.map((userId) => userId.toString());
    recipientIds = chat.participants
      .map((participant) => participant.toString())
      .filter((participantId) => participantId !== input.userId);
  }

  if (input.channelId) {
    channel = await ensureChannelAccess(
      input.channelId,
      input.userId,
      input.replyTo,
    );
    room = `channel:${channel._id}`;
    mutedBy = channel.mutedBy.map((userId) => userId.toString());
    recipientIds = channel.members
      .map((member) => member.toString())
      .filter((memberId) => memberId !== input.userId);
  }

  if (!chat && !channel) {
    throw new AppError("A chat or channel destination is required.");
  }

  let content = (input.content ?? "").trim();
  let metadata: Record<string, unknown> | null = null;

  if (input.file) {
    validateUploadedFile(input.file);

    const upload = await uploadBufferToCloudinary(input.file.buffer, {
      folder: chat ? "pulse/messages" : "pulse/channels",
      resourceType:
        type === "image"
          ? "image"
          : type === "video"
            ? "video"
            : type === "audio" || type === "file"
              ? "raw"
              : "auto",
      filename: input.file.originalname,
    });

    content = upload.secure_url;
    metadata = {
      publicId: upload.public_id,
      originalName: input.file.originalname,
      mimeType: input.file.mimetype,
      size: input.file.size,
      width: upload.width,
      height: upload.height,
      duration: upload.duration,
      thumbnailUrl:
        type === "video"
          ? upload.secure_url
          : type === "image"
            ? upload.secure_url
            : "",
      previewUrl:
        viewMode === "once" && (type === "image" || type === "video")
          ? buildMediaPreviewUrl(upload.public_id, type)
          : type === "image" || type === "video"
            ? upload.secure_url
            : "",
    };
  }

  if (!content && type === "text") {
    throw new AppError("Message content cannot be empty.");
  }

  const message = await Message.create({
    chatId: chat?._id ?? null,
    channelId: channel?._id ?? null,
    senderId: input.userId,
    type,
    content,
    viewMode,
    viewedBy: type === "image" || type === "video" ? [input.userId] : [],
    deliveredTo: [input.userId],
    readBy: [input.userId],
    replyTo: input.replyTo ?? null,
    metadata,
  });

  if (chat) {
    chat.lastMessage = buildLastMessagePayload(message);
    await chat.save();
  }

  if (channel) {
    channel.lastPost = buildLastMessagePayload(message);
    await channel.save();
  }

  const populated = await populateMessageById(message._id.toString());

  if (!populated) {
    throw new AppError("Message could not be created.", 500);
  }

  return {
    chat,
    channel,
    room,
    mutedBy,
    recipientIds,
    message: populated,
  };
};

export const emitMessageToParticipants = async (
  io: Server | undefined,
  payload: Awaited<ReturnType<typeof createMessageEntry>>,
) => {
  if (!io) {
    return;
  }

  const senderId = payload.message.senderId._id?.toString?.() ?? payload.message.senderId.toString();
  io.to(`user:${senderId}`).emit("new_message", serializeMessage(payload.message, senderId));

  await Promise.all(
    payload.recipientIds
      .map(async (recipientId) => {
        io.to(`user:${recipientId}`).emit(
          "new_message",
          serializeMessage(payload.message, recipientId),
        );

        if (!payload.mutedBy.includes(recipientId)) {
          await notifyUser({
            io,
            userId: recipientId,
            type: payload.chat ? "message" : "channel_post",
            title: payload.chat ? "New message" : "New channel update",
            body:
              payload.message.type === "text"
                ? payload.message.content.slice(0, 120)
                : payload.message.type === "image" || payload.message.type === "video"
                  ? "Shared media"
                  : "Sent an attachment",
            data: {
              chatId: payload.chat?._id?.toString() ?? null,
              channelId: payload.channel?._id?.toString() ?? null,
              messageId: payload.message._id.toString(),
            },
          });
        }
      }),
  );
};

const resolveAudienceUserIds = async ({
  chatId,
  channelId,
}: {
  chatId?: string | null;
  channelId?: string | null;
}) => {
  if (chatId) {
    const chat = await Chat.findById(chatId).select("participants");
    return chat?.participants.map((participant) => participant.toString()) ?? [];
  }

  if (channelId) {
    const channel = await Channel.findById(channelId).select("members");
    return channel?.members.map((member) => member.toString()) ?? [];
  }

  return [] as string[];
};

export const emitToMessageAudience = async (
  io: Server | undefined,
  audience: {
    chatId?: string | null;
    channelId?: string | null;
  },
  event: string,
  payloadFactory: (userId: string) => unknown,
) => {
  if (!io) {
    return;
  }

  const userIds = await resolveAudienceUserIds(audience);

  userIds.forEach((userId) => {
    io.to(`user:${userId}`).emit(event, payloadFactory(userId));
  });
};

export const getChatMessages = asyncHandler(async (req, res) => {
  const chat = await ensureChatAccess(String(req.params.chatId), req.userId!);

  const messages = await Message.find({
    chatId: chat._id,
    deletedForEveryoneAt: null,
  })
    .populate("senderId", "username displayName avatarUrl")
    .populate({
      path: "replyTo",
      select: "senderId content type",
    })
    .sort({ createdAt: -1 })
    .limit(50);

  await Message.updateMany(
    {
      _id: { $in: messages.map((message) => message._id) },
      deliveredTo: { $ne: req.user!._id },
    },
    {
      $addToSet: {
        deliveredTo: req.user!._id,
      },
    },
  );

  sendSuccess(res, {
    messages: messages
      .reverse()
      .map((message) => serializeMessage(message, req.userId!))
      .filter(Boolean),
  });
});

export const getChannelMessages = asyncHandler(async (req, res) => {
  const channel = await ensureChannelAccess(
    String(req.params.channelId),
    req.userId!,
  );

  const messages = await Message.find({
    channelId: channel._id,
    deletedForEveryoneAt: null,
  })
    .populate("senderId", "username displayName avatarUrl")
    .populate({
      path: "replyTo",
      select: "senderId content type",
    })
    .sort({ createdAt: -1 })
    .limit(80);

  sendSuccess(res, {
    messages: messages
      .reverse()
      .map((message) => serializeMessage(message, req.userId!))
      .filter(Boolean),
  });
});

export const createMessage = asyncHandler(async (req, res) => {
  const payload = await createMessageEntry({
    userId: req.userId!,
    chatId: typeof req.body.chatId === "string" ? req.body.chatId : undefined,
    channelId:
      typeof req.body.channelId === "string" ? req.body.channelId : undefined,
    type: typeof req.body.type === "string" ? req.body.type : undefined,
    content: typeof req.body.content === "string" ? req.body.content : undefined,
    viewMode:
      req.body.viewMode === "once" || req.body.viewMode === "unlimited"
        ? req.body.viewMode
        : undefined,
    replyTo: typeof req.body.replyTo === "string" ? req.body.replyTo : undefined,
    file: req.file ?? undefined,
  });

  await emitMessageToParticipants(req.app.get("io") as Server | undefined, payload);

  sendSuccess(
    res,
    {
      message: serializeMessage(payload.message, req.userId!),
    },
    201,
  );
});

export const openViewOnceMedia = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    throw new AppError("Message not found.", 404);
  }

  if (message.chatId) {
    await ensureChatAccess(message.chatId.toString(), req.userId!);
  }

  if (message.channelId) {
    await ensureChannelAccess(message.channelId.toString(), req.userId!, message.replyTo?.toString() ?? null);
  }

  if (message.viewMode !== "once") {
    sendSuccess(res, {
      mediaUrl: message.content,
      message: "This media can be viewed normally.",
    });
    return;
  }

  if (message.senderId.toString() === req.userId) {
    sendSuccess(res, {
      mediaUrl: message.content,
      warning: "View-once protections only apply to recipients.",
    });
    return;
  }

  if (message.viewedBy.some((userId) => userId.toString() === req.userId)) {
    throw new AppError("This media has already been opened.", 410);
  }

  message.viewedBy.push(req.user!._id);
  await message.save();

  const io = req.app.get("io") as Server | undefined;
  await emitToMessageAudience(
    io,
    {
      chatId: message.chatId?.toString() ?? null,
      channelId: message.channelId?.toString() ?? null,
    },
    "message_read",
    () => ({
      messageId: message._id.toString(),
      userId: req.userId,
      viewedOnce: true,
    }),
  );

  sendSuccess(res, {
    mediaUrl: message.content,
    warning:
      "View Once limits replay inside Pulse, but web PWAs cannot reliably prevent screenshots or screen recording.",
  });
});

export const editMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId)
    .populate("senderId", "username displayName avatarUrl")
    .populate({
      path: "replyTo",
      select: "senderId content type",
    });

  if (!message) {
    throw new AppError("Message not found.", 404);
  }

  if (message.senderId._id.toString() !== req.userId) {
    throw new AppError("You can only edit your own messages.", 403);
  }

  if (message.type !== "text") {
    throw new AppError("Only text messages can be edited.");
  }

  message.content = String(req.body.content ?? "").trim();
  message.editedAt = new Date();
  await message.save();

  const io = req.app.get("io") as Server | undefined;
  const updatedMessage = serializeMessage(message, req.userId!);

  await emitToMessageAudience(
    io,
    {
      chatId: message.chatId?.toString() ?? null,
      channelId: message.channelId?.toString() ?? null,
    },
    "message_updated",
    (viewerId) => serializeMessage(message, viewerId),
  );

  sendSuccess(res, { message: updatedMessage });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId)
    .populate("senderId", "username displayName avatarUrl")
    .populate({
      path: "replyTo",
      select: "senderId content type",
    });

  if (!message) {
    throw new AppError("Message not found.", 404);
  }

  const mode = req.body.mode === "everyone" ? "everyone" : "me";

  if (mode === "everyone" && message.senderId._id.toString() !== req.userId) {
    throw new AppError("Only the sender can delete a message for everyone.", 403);
  }

  if (mode === "everyone") {
    message.content = "";
    message.metadata = null as any;
    message.deletedForEveryoneAt = new Date();
  } else if (!message.deletedFor.some((userId) => userId.toString() === req.userId)) {
    message.deletedFor.push(req.user!._id);
  }

  await message.save();

  const io = req.app.get("io") as Server | undefined;
  const payload = {
    messageId: message._id.toString(),
    mode,
    userId: req.userId,
  };

  if (mode === "everyone") {
    await emitToMessageAudience(
      io,
      {
        chatId: message.chatId?.toString() ?? null,
        channelId: message.channelId?.toString() ?? null,
      },
      "message_deleted",
      () => payload,
    );
  } else {
    io?.to(`user:${req.userId}`).emit("message_deleted", payload);
  }

  sendSuccess(res, { message: "Message deleted." });
});

export const reactToMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId)
    .populate("senderId", "username displayName avatarUrl")
    .populate({
      path: "replyTo",
      select: "senderId content type",
    });

  if (!message) {
    throw new AppError("Message not found.", 404);
  }

  const emoji = String(req.body.emoji ?? "").trim();

  if (!emoji) {
    throw new AppError("Emoji reaction is required.");
  }

  message.reactions = message.reactions.filter(
    (reaction) => reaction.userId.toString() !== req.userId,
  ) as any;
  message.reactions.push({
    emoji,
    userId: req.user!._id,
    createdAt: new Date(),
  } as any);

  await message.save();

  const serializedMessage = serializeMessage(message, req.userId!);
  const io = req.app.get("io") as Server | undefined;
  await emitToMessageAudience(
    io,
    {
      chatId: message.chatId?.toString() ?? null,
      channelId: message.channelId?.toString() ?? null,
    },
    "reaction_update",
    () => ({
      messageId: message._id.toString(),
      reactions: serializedMessage?.reactions ?? [],
    }),
  );

  sendSuccess(res, { message: serializedMessage });
});

export const markMessagesRead = asyncHandler(async (req, res) => {
  const messageIds = Array.isArray(req.body.messageIds)
    ? req.body.messageIds.map(String)
    : [];

  if (messageIds.length === 0) {
    throw new AppError("At least one message id is required.");
  }

  const messages = await Message.find({ _id: { $in: messageIds } });

  for (const message of messages) {
    if (!message.readBy.some((userId) => userId.toString() === req.userId)) {
      message.readBy.push(req.user!._id);
      await message.save();
    }
  }

  const io = req.app.get("io") as Server | undefined;
  const firstMessage = messages[0];

  if (firstMessage) {
    await emitToMessageAudience(
      io,
      {
        chatId: firstMessage.chatId?.toString() ?? null,
        channelId: firstMessage.channelId?.toString() ?? null,
      },
      "message_read",
      () => ({
        messageIds,
        userId: req.userId,
      }),
    );
  }

  sendSuccess(res, { messageIds });
});
