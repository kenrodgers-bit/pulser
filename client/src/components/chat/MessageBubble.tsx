import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCheck,
  Copy,
  Edit3,
  Forward,
  Pin,
  Reply,
  Trash2,
} from "lucide-react";

import { useUIStore } from "@/store/uiStore";
import type { Message } from "@/types";
import { formatClock } from "@/utils/format";
import { MediaMessage } from "./MediaMessage";
import { ReplyPreview } from "./ReplyPreview";

type MessageBubbleProps = {
  message: Message;
  currentUserId: string;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onDelete: (messageId: string, mode: "me" | "everyone") => void;
  onEdit: (message: Message) => void;
  onOpenMedia: (message: Message) => void;
  onPin?: (messageId: string) => void;
  pinned?: boolean;
};

type ContextState = {
  top: number;
  left: number;
};

const reactionQuickSet = ["\u2764\uFE0F", "\uD83D\uDD25", "\uD83D\uDE02"] as const;
const contextReactionSet = [
  "\u2764\uFE0F",
  "\uD83D\uDD25",
  "\uD83D\uDE02",
  "\uD83D\uDC4F",
] as const;

export const MessageBubble = ({
  message,
  currentUserId,
  onReply,
  onReact,
  onDelete,
  onEdit,
  onOpenMedia,
  onPin,
  pinned = false,
}: MessageBubbleProps) => {
  const isOwn = message.senderId === currentUserId;
  const isDeleted = Boolean(message.deletedForEveryoneAt);
  const pushToast = useUIStore((state) => state.pushToast);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [contextState, setContextState] = useState<ContextState | null>(null);

  useEffect(
    () => () => {
      if (pressTimerRef.current) {
        window.clearTimeout(pressTimerRef.current);
      }
    },
    [],
  );

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setIsPressing(false);
  };

  const openContextMenu = () => {
    const rect = bubbleRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const prefersBelow = rect.top < 120;
    const top = prefersBelow ? rect.bottom + 10 : rect.top - 70;
    const left = Math.min(
      window.innerWidth - 220,
      Math.max(16, isOwn ? rect.right - 210 : rect.left),
    );

    if ("vibrate" in navigator) {
      navigator.vibrate([10, 30, 10]);
    }

    setContextState({ top, left });
  };

  const handlePointerStart = () => {
    clearPressTimer();
    setIsPressing(true);
    pressTimerRef.current = window.setTimeout(() => {
      setIsPressing(false);
      openContextMenu();
    }, 500);
  };

  const statusKey =
    message.readBy.length > 0 ? "read" : message.deliveredTo.length > 0 ? "delivered" : "sent";

  return (
    <>
      <div className={`group flex ${isOwn ? "justify-end" : "justify-start"} animate-messageIn`}>
        <div className={`flex max-w-[72%] flex-col gap-2 ${isOwn ? "items-end" : "items-start"}`}>
          <motion.div
            ref={bubbleRef}
            className={`will-transform ${isOwn ? "bubble-own" : "bubble-other"} ${
              isOwn
                ? "bg-accent text-white shadow-glow"
                : "glass-elevated border border-border bg-[var(--pulse-surface2)] text-[var(--ink)]"
            } px-4 py-3`}
            animate={{ scale: isPressing ? 1.02 : 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            onContextMenu={(event) => {
              event.preventDefault();
              openContextMenu();
            }}
            onPointerDown={handlePointerStart}
            onPointerLeave={clearPressTimer}
            onPointerUp={clearPressTimer}
          >
            {message.replyTo && typeof message.replyTo !== "string" ? (
              <div className="mb-3">
                <ReplyPreview
                  compact
                  message={{
                    ...message,
                    id: message.replyTo.id,
                    content: message.replyTo.content,
                    type: message.replyTo.type,
                  }}
                />
              </div>
            ) : null}

            {isDeleted ? (
              <p className="whitespace-pre-wrap break-words italic text-white/70">
                This message was deleted.
              </p>
            ) : message.type === "text" || message.type === "emoji" || message.type === "sticker" ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
            ) : (
              <MediaMessage
                message={message}
                isOwn={isOwn}
                onOpen={() => onOpenMedia(message)}
              />
            )}

            <div className="mt-3 flex items-center justify-between gap-4 text-[11px]">
              <div className={`flex items-center gap-2 ${isOwn ? "text-white/80" : "text-[var(--muted)]"}`}>
                <span>{formatClock(message.createdAt)}</span>
                {message.editedAt ? <span>edited</span> : null}
                {pinned ? (
                  <span className={`inline-flex items-center gap-1 ${isOwn ? "text-white/90" : "text-[var(--muted)]"}`}>
                    <Pin className="h-3 w-3" />
                    pinned
                  </span>
                ) : null}
              </div>
              {isOwn ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={statusKey}
                    className={`inline-flex items-center gap-1 ${
                      statusKey === "read" ? "text-[#cfc6ff]" : "text-white/85"
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.18 }}
                  >
                    {statusKey === "sent" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCheck className="h-3.5 w-3.5" />
                    )}
                  </motion.span>
                </AnimatePresence>
              ) : null}
            </div>
          </motion.div>

          {message.reactions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {message.reactions.map((reaction) => (
                  <motion.button
                    key={`${message.id}-${reaction.userId}-${reaction.emoji}`}
                    className="rounded-full bg-[var(--pulse-surface)] px-3 py-1 text-sm ring-1 ring-border transition hover:bg-[var(--pulse-surface2)]"
                    onClick={() => onReact(message.id, reaction.emoji)}
                    type="button"
                    initial={{ opacity: 0, scale: 0, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {reaction.emoji}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : null}

          <div className="flex gap-2 opacity-80 transition group-hover:opacity-100">
            {reactionQuickSet.map((emoji) => (
              <button
                key={emoji}
                className="rounded-full bg-white/6 px-2.5 py-1 text-sm text-[var(--muted)] transition hover:bg-white/12 hover:text-[var(--ink)]"
                onClick={() => onReact(message.id, emoji)}
                type="button"
              >
                {emoji}
              </button>
            ))}
            <button
              className="rounded-full bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/12 hover:text-[var(--ink)]"
              onClick={() => onReply(message)}
              type="button"
            >
              <Reply className="h-3.5 w-3.5" />
            </button>
            {onPin ? (
              <button
                className="rounded-full bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/12 hover:text-[var(--ink)]"
                onClick={() => onPin(message.id)}
                type="button"
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {isOwn && message.type === "text" && !isDeleted ? (
              <button
                className="rounded-full bg-white/6 p-2 text-[var(--muted)] transition hover:bg-white/12 hover:text-[var(--ink)]"
                onClick={() => onEdit(message)}
                type="button"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {contextState ? (
          <>
            <motion.button
              className="fixed inset-0 z-[58] bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setContextState(null)}
              type="button"
            />
            <motion.div
              className="glass-elevated fixed z-[59] flex min-w-[208px] flex-col gap-1 rounded-[14px] border border-border p-2 shadow-modal"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              style={{
                top: contextState.top,
                left: contextState.left,
              }}
            >
              <button
                className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition hover:bg-white/8"
                onClick={() => {
                  onReply(message);
                  setContextState(null);
                }}
                type="button"
              >
                <Reply className="h-4 w-4 text-accent-2" />
                Reply
              </button>
              <div className="flex items-center gap-2 px-3 py-2">
                {contextReactionSet.map((emoji) => (
                  <button
                    key={emoji}
                    className="rounded-full bg-white/6 px-2 py-1 text-sm transition hover:bg-white/10"
                    onClick={() => {
                      onReact(message.id, emoji);
                      setContextState(null);
                    }}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {message.content ? (
                <button
                  className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition hover:bg-white/8"
                  onClick={async () => {
                    await navigator.clipboard.writeText(message.content ?? "");
                    pushToast({
                      title: "Copied",
                      description: "Message copied to your clipboard.",
                    });
                    setContextState(null);
                  }}
                  type="button"
                >
                  <Copy className="h-4 w-4 text-accent-2" />
                  Copy
                </button>
              ) : null}
              <button
                className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition hover:bg-white/8"
                onClick={() => {
                  pushToast({
                    title: "Forward coming soon",
                    description: "This action is next on the Pulse UI pass.",
                  });
                  setContextState(null);
                }}
                type="button"
              >
                <Forward className="h-4 w-4 text-accent-2" />
                Forward
              </button>
              <button
                className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm text-danger transition hover:bg-danger/10"
                onClick={() => {
                  onDelete(message.id, isOwn ? "everyone" : "me");
                  setContextState(null);
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                {isOwn ? "Delete for everyone" : "Delete for me"}
              </button>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
};
