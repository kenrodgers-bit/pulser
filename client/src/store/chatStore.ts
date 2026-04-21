import { create } from "zustand";

import type {
  AppNotification,
  Channel,
  Chat,
  Message,
  StoryGroup,
} from "@/types";

type ChatState = {
  chats: Chat[];
  stories: StoryGroup[];
  channels: Channel[];
  notifications: AppNotification[];
  messagesByChatId: Record<string, Message[]>;
  messagesByChannelId: Record<string, Message[]>;
  typingByRoom: Record<string, string[]>;
  onlineUserIds: string[];
  replyingTo: Message | null;
  setChats: (chats: Chat[]) => void;
  upsertChat: (chat: Chat) => void;
  setStories: (stories: StoryGroup[]) => void;
  setChannels: (channels: Channel[]) => void;
  upsertChannel: (channel: Channel) => void;
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  markNotificationRead: (notificationId: string) => void;
  setMessagesForChat: (chatId: string, messages: Message[]) => void;
  setMessagesForChannel: (channelId: string, messages: Message[]) => void;
  upsertMessage: (message: Message) => void;
  updateMessage: (messageId: string, updater: (message: Message) => Message) => void;
  removeMessageForUser: (messageId: string, roomId: string, isChannel?: boolean) => void;
  setTypingState: (roomId: string, userId: string, isTyping: boolean) => void;
  setOnlineState: (userId: string, isOnline: boolean) => void;
  setReplyingTo: (message: Message | null) => void;
};

const buildPreviewFromMessage = (message: Message) => ({
  messageId: message.id,
  senderId: message.senderId,
  type: message.type,
  snippet:
    message.deletedForEveryoneAt
      ? "Message deleted"
      : message.type === "text" || message.type === "emoji" || message.type === "sticker"
        ? (message.content ?? "").slice(0, 120)
        : message.type === "image" || message.type === "video"
          ? "Shared media"
          : message.type === "audio"
            ? "Voice note"
            : "Attachment",
  createdAt: message.createdAt,
});

const upsertInList = (messages: Message[], incoming: Message) => {
  const existingIndex = messages.findIndex((message) => message.id === incoming.id);
  const next = [...messages];

  if (existingIndex === -1) {
    next.push(incoming);
  } else {
    next[existingIndex] = incoming;
  }

  return next.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
};

const rebuildChatSummaries = (
  chats: Chat[],
  messagesByChatId: Record<string, Message[]>,
) =>
  chats.map((chat) => {
    const latest = (messagesByChatId[chat.id] ?? []).at(-1);
    return latest
      ? {
          ...chat,
          lastMessage: buildPreviewFromMessage(latest),
          updatedAt: latest.createdAt,
        }
      : {
          ...chat,
          lastMessage: null,
        };
  });

const rebuildChannelSummaries = (
  channels: Channel[],
  messagesByChannelId: Record<string, Message[]>,
) =>
  channels.map((channel) => {
    const latest = (messagesByChannelId[channel.id] ?? []).at(-1);
    return latest
      ? {
          ...channel,
          lastPost: buildPreviewFromMessage(latest),
        }
      : {
          ...channel,
          lastPost: null,
        };
  });

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  stories: [],
  channels: [],
  notifications: [],
  messagesByChatId: {},
  messagesByChannelId: {},
  typingByRoom: {},
  onlineUserIds: [],
  replyingTo: null,
  setChats: (chats) => set({ chats }),
  upsertChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats.filter((item) => item.id !== chat.id)],
    })),
  setStories: (stories) => set({ stories }),
  setChannels: (channels) => set({ channels }),
  upsertChannel: (channel) =>
    set((state) => ({
      channels: [channel, ...state.channels.filter((item) => item.id !== channel.id)],
    })),
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications.filter((item) => item.id !== notification.id)],
    })),
  markNotificationRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    })),
  setMessagesForChat: (chatId, messages) =>
    set((state) => ({
      messagesByChatId: {
        ...state.messagesByChatId,
        [chatId]: messages,
      },
    })),
  setMessagesForChannel: (channelId, messages) =>
    set((state) => ({
      messagesByChannelId: {
        ...state.messagesByChannelId,
        [channelId]: messages,
      },
    })),
  upsertMessage: (message) =>
    set((state) => {
      if (message.chatId) {
        return {
          chats: [
            ...state.chats
              .map((chat) =>
                chat.id === message.chatId
                  ? {
                      ...chat,
                      lastMessage: buildPreviewFromMessage(message),
                      updatedAt: message.createdAt,
                    }
                  : chat,
              )
              .sort(
                (left, right) =>
                  new Date(right.lastMessage?.createdAt ?? right.updatedAt).getTime() -
                  new Date(left.lastMessage?.createdAt ?? left.updatedAt).getTime(),
              ),
          ],
          messagesByChatId: {
            ...state.messagesByChatId,
            [message.chatId]: upsertInList(
              state.messagesByChatId[message.chatId] ?? [],
              message,
            ),
          },
        };
      }

      if (message.channelId) {
        return {
          channels: [
            ...state.channels
              .map((channel) =>
                channel.id === message.channelId
                  ? {
                      ...channel,
                      lastPost: buildPreviewFromMessage(message),
                    }
                  : channel,
              )
              .sort(
                (left, right) =>
                  new Date(right.lastPost?.createdAt ?? right.createdAt).getTime() -
                  new Date(left.lastPost?.createdAt ?? left.createdAt).getTime(),
              ),
          ],
          messagesByChannelId: {
            ...state.messagesByChannelId,
            [message.channelId]: upsertInList(
              state.messagesByChannelId[message.channelId] ?? [],
              message,
            ),
          },
        };
      }

      return state;
    }),
  updateMessage: (messageId, updater) =>
    set((state) => {
      const messagesByChatId = Object.fromEntries(
        Object.entries(state.messagesByChatId).map(([roomId, messages]) => [
          roomId,
          messages.map((message) =>
            message.id === messageId ? updater(message) : message,
          ),
        ]),
      );
      const messagesByChannelId = Object.fromEntries(
        Object.entries(state.messagesByChannelId).map(([roomId, messages]) => [
          roomId,
          messages.map((message) =>
            message.id === messageId ? updater(message) : message,
          ),
        ]),
      );

      return {
        chats: rebuildChatSummaries(state.chats, messagesByChatId),
        channels: rebuildChannelSummaries(state.channels, messagesByChannelId),
        messagesByChatId,
        messagesByChannelId,
      };
    }),
  removeMessageForUser: (messageId, roomId, isChannel = false) =>
    set((state) => {
      if (isChannel) {
        const messagesByChannelId = {
          ...state.messagesByChannelId,
          [roomId]: (state.messagesByChannelId[roomId] ?? []).filter(
            (message) => message.id !== messageId,
          ),
        };

        return {
          channels: rebuildChannelSummaries(state.channels, messagesByChannelId),
          messagesByChannelId,
        };
      }

      const messagesByChatId = {
        ...state.messagesByChatId,
        [roomId]: (state.messagesByChatId[roomId] ?? []).filter(
          (message) => message.id !== messageId,
        ),
      };

      return {
        chats: rebuildChatSummaries(state.chats, messagesByChatId),
        messagesByChatId,
      };
    }),
  setTypingState: (roomId, userId, isTyping) =>
    set((state) => {
      const current = state.typingByRoom[roomId] ?? [];
      const nextUsers = isTyping
        ? Array.from(new Set([...current, userId]))
        : current.filter((entry) => entry !== userId);

      return {
        typingByRoom: {
          ...state.typingByRoom,
          [roomId]: nextUsers,
        },
      };
    }),
  setOnlineState: (userId, isOnline) =>
    set((state) => ({
      onlineUserIds: isOnline
        ? Array.from(new Set([...state.onlineUserIds, userId]))
        : state.onlineUserIds.filter((id) => id !== userId),
    })),
  setReplyingTo: (message) => set({ replyingTo: message }),
}));
