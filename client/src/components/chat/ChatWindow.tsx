import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { motion } from "framer-motion";
import {
  BellOff,
  ImagePlus,
  Lock,
  Mic,
  Pin,
  SendHorizonal,
} from "lucide-react";

import { getSocket } from "@/lib/socket";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import type { Message, User, ViewMode } from "@/types";
import { sanitizeText } from "@/utils/sanitizers";
import { BottomSheet } from "../ui/BottomSheet";
import { MediaPicker } from "../media/MediaPicker";
import { MessageBubble } from "./MessageBubble";
import { ReplyPreview } from "./ReplyPreview";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { TypingIndicator } from "./TypingIndicator";

type ChatWindowProps = {
  roomId: string;
  roomName: string;
  currentUser: User;
  messages: Message[];
  typingUsers: string[];
  pinnedMessages?: Message[];
  isChannel?: boolean;
  onSend: (payload: {
    content?: string;
    file?: File | null;
    viewMode?: ViewMode;
  }) => Promise<unknown>;
  onEdit: (messageId: string, content: string) => Promise<unknown>;
  onDelete: (messageId: string, mode: "me" | "everyone") => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<unknown>;
  onOpenMedia: (message: Message) => Promise<void> | void;
  onPinMessage?: (messageId: string) => Promise<void>;
  muted?: boolean;
  avatarUrl?: string;
  headerActions?: ReactNode;
  composerPlaceholder?: string;
};

export const ChatWindow = ({
  roomId,
  roomName,
  currentUser,
  messages,
  typingUsers,
  pinnedMessages = [],
  isChannel = false,
  onSend,
  onEdit,
  onDelete,
  onReact,
  onOpenMedia,
  onPinMessage,
  muted = false,
  avatarUrl,
  headerActions,
  composerPlaceholder,
}: ChatWindowProps) => {
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("unlimited");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [mediaSheetOpen, setMediaSheetOpen] = useState(false);
  const replyingTo = useChatStore((state) => state.replyingTo);
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const pushToast = useUIStore((state) => state.pushToast);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socket = useMemo(() => getSocket(), []);

  const handleSelectedFileChange = (file: File | null) => {
    setSelectedFile(file);

    if (!file) {
      setViewMode("unlimited");
      setMediaSheetOpen(false);
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setViewMode("unlimited");
    }

    setMediaSheetOpen(true);
  };

  useEffect(() => {
    return () => {
      if (typingTimer.current) {
        window.clearTimeout(typingTimer.current);
      }

      socket.emit("typing_stop", { chatId: roomId });
      if (recorderRef.current?.state !== "inactive") {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId, socket]);

  useEffect(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    const handleScroll = () => {
      setHeaderSolid(list.scrollTop > 60);
    };

    list.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      list.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      pushToast({
        title: "Voice notes unsupported",
        description: "This browser cannot record audio directly.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      setViewMode("unlimited");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size > 0) {
          handleSelectedFileChange(
            new File([blob], `pulse-voice-note-${Date.now()}.webm`, {
              type: blob.type || "audio/webm",
            }),
          );
          pushToast({
            title: "Voice note attached",
            description: "Review it below, then send when you're ready.",
          });
        }

        recorderRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      pushToast({
        title: "Recording started",
        description: "Tap the mic again to stop and attach your voice note.",
      });
    } catch {
      pushToast({
        title: "Microphone unavailable",
        description: "Allow microphone access to record a voice note.",
      });
    }
  };

  useEffect(() => {
    if (isChannel) {
      socket.emit("join_channel", roomId);
    } else {
      socket.emit("join_chat", roomId);
    }
  }, [isChannel, roomId, socket]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const handleTyping = (nextValue: string) => {
    setDraft(nextValue);

    if (isChannel) {
      return;
    }

    socket.emit("typing_start", { chatId: roomId });

    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current);
    }

    typingTimer.current = window.setTimeout(() => {
      socket.emit("typing_stop", { chatId: roomId });
    }, 900);
  };

  const handleSubmit = async () => {
    const content = sanitizeText(draft);

    try {
      if (editingMessage) {
        if (!content) return;
        await onEdit(editingMessage.id, content);
        setEditingMessage(null);
        setDraft("");
        return;
      }

      if (!selectedFile && !content) {
        return;
      }

      await onSend({
        content,
        file: selectedFile,
        viewMode,
      });

      setDraft("");
      handleSelectedFileChange(null);
      socket.emit("typing_stop", { chatId: roomId });
    } catch (error: any) {
      pushToast({
        title: "Send failed",
        description:
          error?.response?.data?.message ??
          "Pulse could not send that message right now.",
      });
    }
  };

  return (
    <>
      <div className="flex h-full flex-col">
        <div
          className={`sticky top-0 z-10 mb-4 rounded-[18px] px-4 py-3 transition ${
            headerSolid
              ? "glass-elevated border border-border"
              : "bg-transparent"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar src={avatarUrl} alt={roomName} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{roomName}</p>
                <p className="truncate text-sm text-[var(--muted)]">
                  {typingUsers.length > 0 && !isChannel
                    ? "Someone is typing..."
                    : isChannel
                      ? "Broadcasts, comments, and reactions"
                      : "Live chat in sync"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {headerActions}
              {muted ? (
                <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-[var(--muted)]">
                  <BellOff className="mr-1 inline h-3 w-3" />
                  Muted
                </span>
              ) : null}
              {pinnedMessages.length > 0 ? (
                <span className="rounded-full bg-accent/14 px-3 py-1 text-xs text-accent-2">
                  <Pin className="mr-1 inline h-3 w-3" />
                  {pinnedMessages.length} pinned
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div ref={listRef} className="scrollbar-hidden flex-1 space-y-4 overflow-y-auto pr-1">
          {pinnedMessages.length > 0 ? (
            <div className="glass-elevated rounded-[16px] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-2">
                Pinned messages
              </p>
              <div className="mt-3 space-y-2">
                {pinnedMessages.map((message) => (
                  <button
                    key={message.id}
                    className="w-full rounded-[12px] bg-white/4 px-3 py-2 text-left text-sm text-[var(--muted)] transition hover:bg-white/8"
                    onClick={() => onOpenMedia(message)}
                    type="button"
                  >
                    {message.content ||
                      `${message.type[0].toUpperCase()}${message.type.slice(1)} attachment`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) => (
            <motion.div key={message.id} layout>
              <MessageBubble
                message={message}
                currentUserId={currentUser.id}
                pinned={pinnedMessages.some((pinned) => pinned.id === message.id)}
                onReply={(item) => setReplyingTo(item)}
                onReact={onReact}
                onDelete={onDelete}
                onEdit={(item) => {
                  setEditingMessage(item);
                  setDraft(item.content ?? "");
                }}
                onOpenMedia={onOpenMedia}
                onPin={onPinMessage}
              />
            </motion.div>
          ))}

          {typingUsers.length > 0 && !isChannel ? <TypingIndicator /> : null}
        </div>

        <div className="mt-4 space-y-3">
          {replyingTo ? (
            <ReplyPreview message={replyingTo} onClear={() => setReplyingTo(null)} />
          ) : null}
          {editingMessage ? (
            <div className="rounded-[12px] border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-[var(--muted)]">
              Editing your message. Send to save.
            </div>
          ) : null}
          {isRecording ? (
            <div className="rounded-[12px] border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-[var(--muted)]">
              Recording voice note. Tap the mic again to stop and attach it.
            </div>
          ) : null}
          <div
            className={`glass-elevated flex items-end gap-3 rounded-[18px] border px-3 py-3 transition ${
              isComposerFocused ? "border-accent/40 shadow-glow" : "border-border"
            }`}
          >
            <div className="flex gap-2">
              <button
                className="rounded-full bg-white/6 p-3 text-[var(--muted)] transition hover:bg-white/12 hover:text-[var(--ink)]"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  handleSelectedFileChange(file);
                  event.currentTarget.value = "";
                }}
              />
              <button
                className="rounded-full bg-white/6 p-3 text-[var(--muted)] transition hover:bg-white/12 hover:text-[var(--ink)]"
                onClick={() => void toggleVoiceRecording()}
                type="button"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                className="rounded-full bg-white/6 p-3 text-[var(--muted)] transition hover:bg-white/12 hover:text-[var(--ink)]"
                onClick={() =>
                  pushToast({
                    title: "View Once tip",
                    description: "Choose View Once to limit replay of photos and videos inside Pulse.",
                  })
                }
                type="button"
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
            <textarea
              className="min-h-12 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--muted)]"
              placeholder={
                composerPlaceholder ??
                (isChannel ? "Write a channel post or comment..." : "Write a message...")
              }
              rows={1}
              value={draft}
              onBlur={() => setIsComposerFocused(false)}
              onChange={(event) => handleTyping(event.target.value)}
              onFocus={() => setIsComposerFocused(true)}
            />
            <Button
              size="lg"
              iconLeft={<SendHorizonal className="h-4 w-4" />}
              onClick={handleSubmit}
            >
              {editingMessage ? "Save" : "Send"}
            </Button>
          </div>
        </div>
      </div>

      <BottomSheet
        open={mediaSheetOpen && Boolean(selectedFile)}
        onClose={() => handleSelectedFileChange(null)}
        title="Attach media"
      >
        <div className="space-y-4">
          <MediaPicker
            file={selectedFile}
            viewMode={viewMode}
            onFileChange={handleSelectedFileChange}
            onViewModeChange={setViewMode}
          />
          <Button className="w-full" onClick={handleSubmit}>
            Send attachment
          </Button>
        </div>
      </BottomSheet>
    </>
  );
};
