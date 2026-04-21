import { startTransition, useState } from "react";

import { api } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import type { Message, MessageType, ViewMode } from "@/types";
import { sanitizeText } from "@/utils/sanitizers";

type SendMessageOptions = {
  roomId: string;
  isChannel?: boolean;
  content?: string;
  file?: File | null;
  type?: MessageType;
  viewMode?: ViewMode;
  replyTo?: string | null;
};

export const useMessages = () => {
  const [isSending, setIsSending] = useState(false);
  const setMessagesForChat = useChatStore((state) => state.setMessagesForChat);
  const setMessagesForChannel = useChatStore((state) => state.setMessagesForChannel);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const pushToast = useUIStore((state) => state.pushToast);

  const fetchMessages = async (roomId: string, isChannel = false) => {
    const response = await api.get(
      isChannel ? `/messages/channel/${roomId}` : `/messages/chat/${roomId}`,
    );
    const messages = response.data.data.messages as Message[];

    startTransition(() => {
      if (isChannel) {
        setMessagesForChannel(roomId, messages);
      } else {
        setMessagesForChat(roomId, messages);
      }
    });

    return messages;
  };

  const sendMessage = async (options: SendMessageOptions) => {
    const replyTo = options.replyTo ?? useChatStore.getState().replyingTo?.id ?? null;

    setIsSending(true);

    try {
      const hasFile = Boolean(options.file);
      const requestBody: FormData | Record<string, unknown> = hasFile
        ? new FormData()
        : {};

      if (requestBody instanceof FormData && options.file) {
        requestBody.append("file", options.file);
        requestBody.append(options.isChannel ? "channelId" : "chatId", options.roomId);
        requestBody.append("viewMode", options.viewMode ?? "unlimited");
        if (replyTo) requestBody.append("replyTo", replyTo);
      } else {
        Object.assign(requestBody, {
          [options.isChannel ? "channelId" : "chatId"]: options.roomId,
          content: sanitizeText(options.content ?? ""),
          type: options.type ?? "text",
          replyTo,
        });
      }

      const response = await api.post("/messages", requestBody, {
        headers:
          requestBody instanceof FormData
            ? {
                "Content-Type": "multipart/form-data",
              }
            : undefined,
      });

      const message = response.data.data.message as Message;
      upsertMessage(message);
      setReplyingTo(null);
      return message;
    } finally {
      setIsSending(false);
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    const response = await api.patch(`/messages/${messageId}`, {
      content: sanitizeText(content),
    });
    const message = response.data.data.message as Message;
    upsertMessage(message);
    return message;
  };

  const deleteMessage = async (
    messageId: string,
    mode: "me" | "everyone" = "me",
  ) => {
    await api.delete(`/messages/${messageId}`, {
      data: {
        mode,
      },
    });
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    const response = await api.post(`/messages/${messageId}/reactions`, {
      emoji,
    });
    const message = response.data.data.message as Message;
    upsertMessage(message);
    return message;
  };

  const markMessagesRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) {
      return;
    }

    await api.post("/messages/read", {
      messageIds,
    });
  };

  const openViewOnceMedia = async (messageId: string) => {
    try {
      const response = await api.post(`/messages/${messageId}/open`);
      updateMessage(messageId, (message) => ({
        ...message,
        metadata: {
          ...message.metadata,
          isViewable: false,
          wasOpened: true,
        },
      }));
      return response.data.data as {
        mediaUrl: string;
        warning?: string;
      };
    } catch (error: any) {
      pushToast({
        title: "View once unavailable",
        description:
          error?.response?.data?.message ??
          "That media was already opened or expired.",
      });
      throw error;
    }
  };

  return {
    isSending,
    fetchMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    markMessagesRead,
    openViewOnceMedia,
  };
};
