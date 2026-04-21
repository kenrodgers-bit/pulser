import { motion } from "framer-motion";
import { Link } from "react-router-dom";

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
    return "Open this conversation";
  }

  if (chat.lastMessage.type === "image" || chat.lastMessage.type === "video") {
    return "📷 Photo";
  }

  if (chat.lastMessage.type === "audio") {
    return "🎵 Audio";
  }

  if (chat.lastMessage.type === "file") {
    return "📎 File";
  }

  return chat.lastMessage.snippet || "Open this conversation";
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
    userId: typeof otherParticipant === "string" ? otherParticipant : otherParticipant?.id ?? "",
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
      <div className="glass-panel rounded-[14px] border border-dashed border-border px-5 py-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-[18px] border border-border bg-white/4" />
        <p className="font-heading text-xl font-semibold">No conversations yet</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Search for friends and start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
      const avatar = resolveAvatar(chat, currentUser.id);

      return (
        <motion.div key={chat.id} layout>
          <Link
            to={`/chat/${chat.id}`}
            className={`glass-panel flex h-16 items-center gap-3 rounded-[14px] px-3 py-3 transition ${
              activeChatId === chat.id ? "border-accent/30 bg-accent/10" : "hover:bg-white/8"
            }`}
          >
            <Avatar
              src={avatar.src}
              alt={avatar.alt}
              online={onlineUserIds.includes(avatar.userId)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {resolveTitle(chat, currentUser.id)}
                  </p>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {resolvePreview(chat)}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-[var(--muted)]">
                  <p>{formatRelativeTime(chat.lastMessage?.createdAt ?? chat.updatedAt)}</p>
                  {chat.isGroup ? (
                    <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-accent/80">
                      {compactNumber(chat.participants.length)}
                    </p>
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
