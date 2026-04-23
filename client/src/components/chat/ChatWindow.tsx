import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { motion } from "framer-motion";
import {
  BellOff,
  ChevronLeft,
  Mic,
  MoreHorizontal,
  Paperclip,
  Phone,
  Pin,
  SendHorizonal,
  SmilePlus,
  Video,
} from "lucide-react";

import { getSocket } from "@/lib/socket";
import { isRealtimeConfigured } from "@/lib/runtimeConfig";
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
import { formatTypingLabel } from "./typingLabel";

type ChatWindowProps = {
  roomId: string;
  roomName: string;
  currentUser: User;
  messages: Message[];
  typingNames?: string[];
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
  onBack?: () => void;
};

export const ChatWindow = ({
  roomId,
  roomName,
  currentUser,
  messages,
  typingNames = [],
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
  onBack,
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
  const typingLabel = useMemo(
    () => (isChannel ? null : formatTypingLabel(typingNames)),
    [isChannel, typingNames],
  );

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

      socket?.emit("typing_stop", { chatId: roomId });

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
      setHeaderSolid(list.scrollTop > 20);
    };

    list.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      list.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isChannel) {
      socket?.emit("join_channel", roomId);
    } else {
      socket?.emit("join_chat", roomId);
    }
  }, [isChannel, roomId, socket]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

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

  const handleTyping = (nextValue: string) => {
    setDraft(nextValue);

    if (isChannel) {
      return;
    }

    socket?.emit("typing_start", { chatId: roomId });

    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current);
    }

    typingTimer.current = window.setTimeout(() => {
      socket?.emit("typing_stop", { chatId: roomId });
    }, 900);
  };

  const handleSubmit = async () => {
    const content = sanitizeText(draft);

    try {
      if (editingMessage) {
        if (!content) {
          return;
        }

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
      socket?.emit("typing_stop", { chatId: roomId });
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
      <div className="ig-chat-window">
        <div
          className={`ig-chat-window__header ${
            headerSolid ? "ig-chat-window__header--solid" : ""
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {onBack ? (
              <button className="ig-icon-button lg:hidden" onClick={onBack} type="button">
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            <Avatar src={avatarUrl} alt={roomName} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{roomName}</p>
              <p className="truncate text-[12px] text-[var(--text-secondary)]">
                {typingLabel
                  ? typingLabel
                  : isChannel
                    ? "Broadcasts, comments, and reactions"
                    : isRealtimeConfigured
                      ? "Active now"
                      : "Messages sync when you send"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isChannel ? (
              <>
                <button className="ig-icon-button" type="button">
                  <Video className="h-4 w-4" />
                </button>
                <button className="ig-icon-button" type="button">
                  <Phone className="h-4 w-4" />
                </button>
              </>
            ) : null}
            {headerActions}
            <button className="ig-icon-button" type="button">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {muted ? (
              <span className="ig-pill">
                <BellOff className="h-3 w-3" />
                Muted
              </span>
            ) : null}
            {pinnedMessages.length > 0 ? (
              <span className="ig-pill">
                <Pin className="h-3 w-3" />
                {pinnedMessages.length}
              </span>
            ) : null}
          </div>
        </div>

        <div ref={listRef} className="ig-chat-window__feed scrollbar-hidden">
          {pinnedMessages.length > 0 ? (
            <div className="ig-soft-card mb-4 p-4">
              <p className="ig-section-label">Pinned</p>
              <div className="mt-3 space-y-2">
                {pinnedMessages.map((message) => (
                  <button
                    key={message.id}
                    className="w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-left text-sm text-[var(--text-secondary)]"
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

          <div className="ig-message-feed">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index * 0.03, 0.18),
                  duration: 0.2,
                  ease: "easeOut",
                }}
              >
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

            {typingLabel ? <TypingIndicator /> : null}
          </div>
        </div>

        <div className="ig-chat-window__composer">
          {replyingTo ? (
            <ReplyPreview message={replyingTo} onClear={() => setReplyingTo(null)} />
          ) : null}
          {editingMessage ? (
            <div className="ig-chat-window__notice mt-3">
              Editing your message. Send to save changes.
            </div>
          ) : null}
          {isRecording ? (
            <div className="ig-chat-window__notice mt-3">
              Recording voice note. Tap the mic again to stop and attach it.
            </div>
          ) : null}

          <div className="ig-chat-window__composer-shell">
            <div
              className={`ig-chat-window__composer-main ${
                isComposerFocused ? "ig-chat-window__composer-main--focused" : ""
              }`}
            >
              <button
                className="ig-icon-button"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <Paperclip className="h-4 w-4" />
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
              <textarea
                className="ig-chat-window__textarea"
                placeholder={
                  composerPlaceholder ??
                  (isChannel ? "Message channel..." : "Message...")
                }
                rows={1}
                value={draft}
                onBlur={() => setIsComposerFocused(false)}
                onChange={(event) => handleTyping(event.target.value)}
                onFocus={() => setIsComposerFocused(true)}
              />
              <button
                className="ig-icon-button"
                onClick={() =>
                  pushToast({
                    title: "Emoji reactions",
                    description: "Long press any message to react instantly.",
                  })
                }
                type="button"
              >
                <SmilePlus className="h-4 w-4" />
              </button>
              {draft.trim() || editingMessage ? (
                <button className="ig-icon-button ig-icon-button--solid" onClick={handleSubmit} type="button">
                  <SendHorizonal className="h-4 w-4" />
                </button>
              ) : (
                <button
                  className="ig-icon-button ig-icon-button--solid"
                  onClick={() => void toggleVoiceRecording()}
                  type="button"
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <BottomSheet
        open={mediaSheetOpen && Boolean(selectedFile)}
        onClose={() => handleSelectedFileChange(null)}
        title="Media picker"
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
