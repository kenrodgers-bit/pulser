import { useEffect, useEffectEvent } from "react";

import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { isRealtimeConfigured } from "@/lib/runtimeConfig";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import type { AppNotification, Message, StoryGroup } from "@/types";

const unique = (values: string[]) => Array.from(new Set(values));

export const useSocket = () => {
  const user = useAuthStore((state) => state.user);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const removeMessageForUser = useChatStore((state) => state.removeMessageForUser);
  const setTypingState = useChatStore((state) => state.setTypingState);
  const setOnlineState = useChatStore((state) => state.setOnlineState);
  const addNotification = useChatStore((state) => state.addNotification);
  const setStories = useChatStore((state) => state.setStories);
  const pushToast = useUIStore((state) => state.pushToast);

  const handleNewMessage = useEffectEvent((message: Message) => {
    upsertMessage(message);
  });

  const handleTyping = useEffectEvent(
    (payload: { chatId: string; userId: string; isTyping: boolean }) => {
      setTypingState(payload.chatId, payload.userId, payload.isTyping);
    },
  );

  const handleMessageRead = useEffectEvent(
    (payload: {
      messageIds?: string[];
      messageId?: string;
      userId: string;
      viewedOnce?: boolean;
    }) => {
      const ids = payload.messageIds ?? (payload.messageId ? [payload.messageId] : []);

      ids.forEach((id) => {
        updateMessage(id, (message) => ({
          ...message,
          readBy: unique([...message.readBy, payload.userId]),
          metadata:
            payload.viewedOnce && message.metadata
              ? {
                  ...message.metadata,
                  isViewable: false,
                  wasOpened: true,
                }
              : message.metadata,
        }));
      });
    },
  );

  const handleDelivered = useEffectEvent(
    (payload: { messageIds: string[]; userId: string }) => {
      payload.messageIds.forEach((id) => {
        updateMessage(id, (message) => ({
          ...message,
          deliveredTo: unique([...message.deliveredTo, payload.userId]),
        }));
      });
    },
  );

  const handleReaction = useEffectEvent(
    (payload: { messageId: string; reactions: Message["reactions"] }) => {
      updateMessage(payload.messageId, (message) => ({
        ...message,
        reactions: payload.reactions,
      }));
    },
  );

  const handleDeleted = useEffectEvent(
    (payload: { messageId: string; mode: "me" | "everyone"; userId: string }) => {
      if (payload.mode === "me") {
        if (payload.userId !== user?.id) {
          return;
        }

        const state = useChatStore.getState();
        const chatEntry = Object.entries(state.messagesByChatId).find(([, messages]) =>
          messages.some((message) => message.id === payload.messageId),
        );

        if (chatEntry) {
          removeMessageForUser(payload.messageId, chatEntry[0], false);
          return;
        }

        const channelEntry = Object.entries(state.messagesByChannelId).find(([, messages]) =>
          messages.some((message) => message.id === payload.messageId),
        );

        if (channelEntry) {
          removeMessageForUser(payload.messageId, channelEntry[0], true);
        }
        return;
      }

      updateMessage(payload.messageId, (message) => ({
        ...message,
        content: "",
        metadata: null,
        deletedForEveryoneAt: new Date().toISOString(),
      }));
    },
  );

  const handleMessageUpdated = useEffectEvent((message: Message) => {
    upsertMessage(message);
  });

  const handleOnline = useEffectEvent((payload: { userId: string }) => {
    setOnlineState(payload.userId, true);
  });

  const handleOffline = useEffectEvent((payload: { userId: string }) => {
    setOnlineState(payload.userId, false);
  });

  const handleNotification = useEffectEvent((notification: AppNotification) => {
    addNotification(notification);
    pushToast({
      title: notification.title,
      description: notification.body,
    });
  });

  const handleNewStory = useEffectEvent((story: StoryGroup["stories"][number]) => {
    void api
      .get("/stories")
      .then((response) => {
        setStories(response.data.data.stories as StoryGroup[]);

        if (story.userId !== user?.id) {
          pushToast({
            title: "New story",
            description: "A friend shared a fresh story.",
          });
        }
      })
      .catch(() => {
        pushToast({
          title: "Stories out of sync",
          description: "Refresh the page if new stories do not appear yet.",
        });
      });
  });

  useEffect(() => {
    if (!user) {
      const currentSocket = getSocket();
      currentSocket?.disconnect();
      return;
    }

    if (!isRealtimeConfigured) {
      return;
    }

    const socket = getSocket();
    if (!socket) {
      return;
    }

    socket.connect();

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleTyping);
    socket.on("message_read", handleMessageRead);
    socket.on("message_delivered", handleDelivered);
    socket.on("reaction_update", handleReaction);
    socket.on("message_deleted", handleDeleted);
    socket.on("message_updated", handleMessageUpdated);
    socket.on("user_online", handleOnline);
    socket.on("user_offline", handleOffline);
    socket.on("notification:new", handleNotification);
    socket.on("new_story", handleNewStory);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleTyping);
      socket.off("message_read", handleMessageRead);
      socket.off("message_delivered", handleDelivered);
      socket.off("reaction_update", handleReaction);
      socket.off("message_deleted", handleDeleted);
      socket.off("message_updated", handleMessageUpdated);
      socket.off("user_online", handleOnline);
      socket.off("user_offline", handleOffline);
      socket.off("notification:new", handleNotification);
      socket.off("new_story", handleNewStory);
      socket.disconnect();
    };
  }, [
    user,
    handleDeleted,
    handleDelivered,
    handleMessageRead,
    handleMessageUpdated,
    handleNewMessage,
    handleNewStory,
    handleNotification,
    handleOffline,
    handleOnline,
    handleReaction,
    handleTyping,
    removeMessageForUser,
  ]);
};
