import { Types } from "mongoose";

import { Chat } from "../models/Chat";
import type { IMessage } from "../models/Message";

export const createDirectChatKey = (userA: string, userB: string) =>
  [userA, userB].sort().join(":");

export const getOrCreateDirectChat = async (
  userId: string,
  otherUserId: string,
) => {
  const directChatKey = createDirectChatKey(userId, otherUserId);

  let chat = await Chat.findOne({ directChatKey });

  if (!chat) {
    chat = await Chat.create({
      participants: [new Types.ObjectId(userId), new Types.ObjectId(otherUserId)],
      isGroup: false,
      directChatKey,
    });
  }

  return chat;
};

export const buildLastMessagePayload = (message: IMessage) => ({
  messageId: message._id,
  senderId: message.senderId,
  type: message.type,
  snippet:
    message.type === "text"
      ? message.content.slice(0, 120)
      : message.type === "image" || message.type === "video"
        ? "Shared media"
        : "Attachment",
  createdAt: message.createdAt,
});
