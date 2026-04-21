import type { HydratedDocument, Types } from "mongoose";

import type { IChat } from "../models/Chat";
import type { IMessage } from "../models/Message";
import type { INotification } from "../models/Notification";
import type { IStory } from "../models/Story";
import type { IUser } from "../models/User";

const normalizeId = (
  value:
    | string
    | Types.ObjectId
    | {
        _id?: string | Types.ObjectId;
      },
) => {
  if (typeof value === "string") {
    return value;
  }

  if ("_id" in value && value._id) {
    return value._id.toString();
  }

  return value.toString();
};

export const serializeUser = (
  user: HydratedDocument<IUser>,
  currentUserId?: string,
) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  authProvider: user.authProvider,
  isVerified: user.isVerified,
  needsUsernameSetup: Boolean((user as any).needsUsernameSetup),
  friends: user.friends.map((friend) => friend.toString()),
  friendRequestsSent: user.friendRequestsSent.map((request) =>
    request.toString(),
  ),
  friendRequestsReceived: user.friendRequestsReceived.map((request) =>
    request.toString(),
  ),
  privacy: user.privacy,
  notificationSettings: user.notificationSettings,
  isCurrentUser: currentUserId === user._id.toString(),
  createdAt: user.createdAt,
});

export const serializeMessage = (
  message: HydratedDocument<IMessage> | Record<string, any>,
  viewerId: string,
) => {
  const source =
    "toObject" in message ? message.toObject({ virtuals: true }) : message;
  const senderId = normalizeId(source.senderId);
  const isSender = senderId === viewerId;
  const deletedForViewer = (source.deletedFor ?? []).some(
    (id: Types.ObjectId | string) => normalizeId(id) === viewerId,
  );
  const viewedAlready =
    source.viewMode === "once" &&
    !isSender &&
    (source.viewedBy ?? []).some(
      (id: Types.ObjectId | string) => normalizeId(id) === viewerId,
    );
  const lockedOnceMedia =
    source.viewMode === "once" &&
    !isSender &&
    (source.type === "image" || source.type === "video");

  if (deletedForViewer) {
    return null;
  }

  return {
    id: source._id.toString(),
    chatId: source.chatId?.toString?.() ?? null,
    channelId: source.channelId?.toString?.() ?? null,
    senderId,
    sender:
      source.senderId?.username
        ? {
            id: source.senderId._id.toString(),
            username: source.senderId.username,
            displayName: source.senderId.displayName,
            avatarUrl: source.senderId.avatarUrl,
          }
        : null,
    type: source.type,
    content: lockedOnceMedia || viewedAlready ? null : source.content,
    viewMode: source.viewMode,
    viewedBy: (source.viewedBy ?? []).map((id: Types.ObjectId | string) =>
      normalizeId(id),
    ),
    deliveredTo: (source.deliveredTo ?? []).map((id: Types.ObjectId | string) =>
      normalizeId(id),
    ),
    readBy: (source.readBy ?? []).map((id: Types.ObjectId | string) =>
      normalizeId(id),
    ),
    replyTo:
      source.replyTo && typeof source.replyTo === "object"
        ? {
            id: source.replyTo._id.toString(),
            senderId: normalizeId(source.replyTo.senderId),
            content: source.replyTo.content,
            type: source.replyTo.type,
          }
        : source.replyTo,
    reactions: (source.reactions ?? []).map(
      (reaction: { emoji: string; userId: Types.ObjectId | string }) => ({
        emoji: reaction.emoji,
        userId: normalizeId(reaction.userId),
      }),
    ),
    deletedFor: (source.deletedFor ?? []).map((id: Types.ObjectId | string) =>
      normalizeId(id),
    ),
    deletedForEveryoneAt: source.deletedForEveryoneAt,
    editedAt: source.editedAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    metadata: source.metadata
      ? {
          ...source.metadata,
          isViewable: source.viewMode !== "once" || isSender || !viewedAlready,
          wasOpened: viewedAlready,
        }
      : null,
  };
};

export const serializeChat = (
  chat: HydratedDocument<IChat> | Record<string, any>,
) => {
  const source = "toObject" in chat ? chat.toObject({ virtuals: true }) : chat;

  return {
    id: source._id.toString(),
    participants: (source.participants ?? []).map((participant: any) =>
      participant?.username
        ? {
            id: participant._id.toString(),
            username: participant.username,
            displayName: participant.displayName,
            avatarUrl: participant.avatarUrl,
          }
        : participant.toString(),
    ),
    isGroup: source.isGroup,
    groupName: source.groupName,
    groupDescription: source.groupDescription,
    groupAvatar: source.groupAvatar,
    admins: (source.admins ?? []).map((admin: any) => normalizeId(admin)),
    ownerId: source.ownerId?.toString?.() ?? null,
    inviteCode: source.inviteCode,
    mutedBy: (source.mutedBy ?? []).map((userId: Types.ObjectId | string) =>
      normalizeId(userId),
    ),
    pinnedMessages: (source.pinnedMessages ?? []).map(
      (messageId: Types.ObjectId | string) => normalizeId(messageId),
    ),
    lastMessage: source.lastMessage ?? null,
    updatedAt: source.updatedAt,
  };
};

export const serializeStory = (story: HydratedDocument<IStory>) => ({
  id: story._id.toString(),
  userId: story.userId.toString(),
  mediaUrl: story.mediaUrl,
  mediaType: story.mediaType,
  thumbnailUrl: story.thumbnailUrl,
  caption: story.caption,
  viewers: story.viewers.map((viewer) => ({
    userId: normalizeId(viewer.userId as any),
    user:
      typeof viewer.userId === "object" && "displayName" in viewer.userId
        ? {
            id: viewer.userId._id.toString(),
            username: (viewer.userId as any).username,
            displayName: (viewer.userId as any).displayName,
            avatarUrl: (viewer.userId as any).avatarUrl,
          }
        : null,
    viewedAt: viewer.viewedAt,
  })),
  reactions: story.reactions.map((reaction) => ({
    userId: reaction.userId.toString(),
    emoji: reaction.emoji,
  })),
  expiresAt: story.expiresAt,
  createdAt: story.createdAt,
});

export const serializeNotification = (
  notification: HydratedDocument<INotification>,
) => ({
  id: notification._id.toString(),
  userId: notification.userId.toString(),
  type: notification.type,
  title: notification.title,
  body: notification.body,
  data: notification.data,
  isRead: notification.isRead,
  readAt: notification.readAt,
  createdAt: notification.createdAt,
});
