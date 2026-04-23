import { useEffect, useMemo, useRef, useState } from "react";

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

const reactionQuickSet = ["❤️", "🔥", "😂"] as const;
const contextReactionSet = ["❤️", "🔥", "😂", "👏"] as const;

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

  const reactionSummary = useMemo(() => {
    const counts = new Map<string, number>();

    for (const reaction of message.reactions) {
      counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1);
    }

    return [...counts.entries()].map(([emoji, count]) => ({ emoji, count }));
  }, [message.reactions]);

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
    const top = prefersBelow ? rect.bottom + 10 : rect.top - 180;
    const left = Math.min(
      window.innerWidth - 240,
      Math.max(16, isOwn ? rect.right - 216 : rect.left),
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
      <div className={isOwn ? "ig-message-row ig-message-row--own" : "ig-message-row"}>
        <div className={isOwn ? "ig-message-stack ig-message-stack--own" : "ig-message-stack"}>
          <motion.div
            ref={bubbleRef}
            animate={{ scale: isPressing ? 1.02 : 1 }}
            className={`ig-message-bubble ${isOwn ? "ig-message-bubble--own" : "ig-message-bubble--other"} ${
              message.type === "emoji" ? "ig-message-bubble--emoji" : ""
            }`}
            onContextMenu={(event) => {
              event.preventDefault();
              openContextMenu();
            }}
            onPointerDown={handlePointerStart}
            onPointerLeave={clearPressTimer}
            onPointerUp={clearPressTimer}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
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
              <p className="whitespace-pre-wrap break-words italic opacity-80">
                This message was deleted.
              </p>
            ) : message.type === "text" || message.type === "emoji" || message.type === "sticker" ? (
              <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
            ) : (
              <MediaMessage message={message} isOwn={isOwn} onOpen={() => onOpenMedia(message)} />
            )}

            {message.type !== "emoji" ? (
              <div className={`mt-3 ig-message-meta ${isOwn ? "ig-message-meta--own" : ""}`}>
                <span>{formatClock(message.createdAt)}</span>
                {message.editedAt ? <span>edited</span> : null}
                {pinned ? (
                  <span className="inline-flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    pinned
                  </span>
                ) : null}
                {isOwn ? (
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={statusKey}
                      className="inline-flex items-center gap-1"
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
            ) : null}
          </motion.div>

          {reactionSummary.length > 0 ? (
            <div className="ig-reaction-row">
              <AnimatePresence initial={false}>
                {reactionSummary.map((reaction) => (
                  <motion.button
                    key={`${message.id}-${reaction.emoji}`}
                    className="ig-reaction-pill"
                    initial={{ opacity: 0, scale: 0, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => onReact(message.id, reaction.emoji)}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          ) : null}

          <div className="ig-quick-actions">
            {reactionQuickSet.map((emoji) => (
              <button
                key={emoji}
                className="ig-quick-action"
                onClick={() => onReact(message.id, emoji)}
                type="button"
              >
                {emoji}
              </button>
            ))}
            <button className="ig-quick-action" onClick={() => onReply(message)} type="button">
              <Reply className="h-3.5 w-3.5" />
            </button>
            {onPin ? (
              <button className="ig-quick-action" onClick={() => onPin(message.id)} type="button">
                <Pin className="h-3.5 w-3.5" />
              </button>
            ) : null}
            {isOwn && message.type === "text" && !isDeleted ? (
              <button className="ig-quick-action" onClick={() => onEdit(message)} type="button">
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
              className="ig-context-menu fixed z-[59]"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              style={{
                left: contextState.left,
                top: contextState.top,
              }}
            >
              <div className="flex items-center gap-2 px-1 pb-1">
                {contextReactionSet.map((emoji) => (
                  <button
                    key={emoji}
                    className="ig-quick-action"
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
              <button
                className="ig-context-menu__item"
                onClick={() => {
                  onReply(message);
                  setContextState(null);
                }}
                type="button"
              >
                <Reply className="h-4 w-4 text-[var(--unread)]" />
                Reply
              </button>
              {message.content ? (
                <button
                  className="ig-context-menu__item"
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
                  <Copy className="h-4 w-4 text-[var(--unread)]" />
                  Copy
                </button>
              ) : null}
              <button
                className="ig-context-menu__item"
                onClick={() => {
                  pushToast({
                    title: "Forward coming soon",
                    description: "This action is next on the Pulse UI pass.",
                  });
                  setContextState(null);
                }}
                type="button"
              >
                <Forward className="h-4 w-4 text-[var(--unread)]" />
                Forward
              </button>
              <button
                className="ig-context-menu__item ig-context-menu__item--danger"
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
