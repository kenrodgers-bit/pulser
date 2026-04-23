import { Link } from "react-router-dom";

import { motion } from "framer-motion";

import type { Chat, User } from "@/types";
import { compactNumber, formatRelativeTime } from "@/utils/format";
import { Avatar } from "../ui/Avatar";

type ChatListProps = {
  chats: Chat[];
  currentUser: User;
  activeChatId?: string | null;
  onlineUserIds?: string[];
};

const resolvePreview = (chat: Chat) => {
  if (!chat.lastMessage) {
    return "Start chatting";
  }

  if (chat.lastMessage.type === "image") {
    return "Photo";
  }

  if (chat.lastMessage.type === "video") {
    return "Video";
  }

  if (chat.lastMessage.type === "audio") {
    return "Audio";
  }

  if (chat.lastMessage.type === "file") {
    return "File";
  }

  return chat.lastMessage.snippet || "Start chatting";
};

const resolveTitle = (chat: Chat, currentUserId: string) => {
  if (chat.isGroup) {
    return chat.groupName || "Group chat";
  }

  const otherParticipant = chat.participants.find(
    (participant) =>
      typeof participant !== "string" && participant.id !== currentUserId,
  );

  return typeof otherParticipant === "string"
    ? "Direct chat"
    : otherParticipant?.displayName || otherParticipant?.username || "Direct chat";
};

const resolveAvatar = (chat: Chat, currentUserId: string) => {
  if (chat.isGroup) {
    return {
      src: chat.groupAvatar,
      alt: chat.groupName || "Group chat",
      userId: chat.ownerId || chat.id,
    };
  }

  const otherParticipant = chat.participants.find(
    (participant) =>
      typeof participant !== "string" && participant.id !== currentUserId,
  );

  return {
    src: typeof otherParticipant === "string" ? undefined : otherParticipant?.avatarUrl,
    alt:
      typeof otherParticipant === "string"
        ? "Direct chat"
        : otherParticipant?.displayName || "Direct chat",
    userId:
      typeof otherParticipant === "string" ? otherParticipant : otherParticipant?.id ?? "",
  };
};

export const ChatList = ({
  chats,
  currentUser,
  activeChatId,
  onlineUserIds = [],
}: ChatListProps) => {
  if (chats.length === 0) {
    return (
      <div className="ig-empty-state">
        <div className="ig-empty-art" />
        <p className="text-[15px] text-[var(--text-secondary)]">No messages yet</p>
        <p className="text-[12px] text-[var(--text-muted)]">
          Search for friends to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="ig-chat-list">
      {chats.map((chat, index) => {
        const avatar = resolveAvatar(chat, currentUser.id);

        return (
          <motion.div
            key={chat.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.16) }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              to={`/chat/${chat.id}`}
              className={`ig-chat-item ${activeChatId === chat.id ? "ig-chat-item--active" : ""}`}
            >
              <Avatar
                src={avatar.src}
                alt={avatar.alt}
                online={onlineUserIds.includes(avatar.userId)}
              />
              <div className="ig-chat-item__body">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="ig-chat-item__name truncate">
                      {resolveTitle(chat, currentUser.id)}
                    </p>
                    <p className="ig-chat-item__preview">
                      {resolvePreview(chat)}
                    </p>
                  </div>
                  <div className="ig-chat-item__meta">
                    <p className="ig-chat-item__time">
                      {formatRelativeTime(chat.lastMessage?.createdAt ?? chat.updatedAt)}
                    </p>
                    {chat.isGroup ? (
                      <span className="ig-badge">
                        {compactNumber(chat.participants.length)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
};
