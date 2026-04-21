import { beforeEach, describe, expect, it } from "vitest";

import type { Channel, Chat, Message } from "@/types";
import { useChatStore } from "./chatStore";

const makeBaseMessage = (overrides: Partial<Message>): Message => ({
  id: crypto.randomUUID(),
  chatId: null,
  channelId: null,
  senderId: "user-1",
  sender: null,
  type: "text",
  content: "Hello",
  viewMode: "unlimited",
  viewedBy: [],
  deliveredTo: [],
  readBy: [],
  replyTo: null,
  reactions: [],
  deletedFor: [],
  deletedForEveryoneAt: null,
  editedAt: null,
  createdAt: "2026-04-21T10:00:00.000Z",
  updatedAt: "2026-04-21T10:00:00.000Z",
  metadata: null,
  ...overrides,
});

beforeEach(() => {
  useChatStore.setState({
    chats: [],
    stories: [],
    channels: [],
    notifications: [],
    messagesByChatId: {},
    messagesByChannelId: {},
    typingByRoom: {},
    onlineUserIds: [],
    replyingTo: null,
  });
});

describe("chatStore", () => {
  it("falls back to the previous message preview when the latest chat message is removed", () => {
    const chat: Chat = {
      id: "chat-1",
      participants: [],
      isGroup: false,
      admins: [],
      mutedBy: [],
      pinnedMessages: [],
      lastMessage: null,
      updatedAt: "2026-04-21T10:00:00.000Z",
    };
    const firstMessage = makeBaseMessage({
      id: "m-1",
      chatId: "chat-1",
      content: "First message",
      createdAt: "2026-04-21T10:00:00.000Z",
    });
    const secondMessage = makeBaseMessage({
      id: "m-2",
      chatId: "chat-1",
      content: "Second message",
      createdAt: "2026-04-21T10:05:00.000Z",
      updatedAt: "2026-04-21T10:05:00.000Z",
    });

    useChatStore.setState({ chats: [chat] });
    const store = useChatStore.getState();
    store.upsertMessage(firstMessage);
    store.upsertMessage(secondMessage);
    store.removeMessageForUser("m-2", "chat-1");

    const nextChat = useChatStore.getState().chats[0];
    expect(nextChat.lastMessage?.snippet).toBe("First message");
    expect(nextChat.updatedAt).toBe("2026-04-21T10:00:00.000Z");
  });

  it("clears the channel preview when its only post is removed", () => {
    const channel: Channel = {
      id: "channel-1",
      name: "Pulse News",
      slug: "pulse-news",
      description: "",
      visibility: "public",
      ownerId: "user-1",
      admins: ["user-1"],
      members: ["user-1"],
      mutedBy: [],
      subscriberCount: 1,
      lastPost: null,
      createdAt: "2026-04-21T10:00:00.000Z",
    };
    const post = makeBaseMessage({
      id: "post-1",
      channelId: "channel-1",
      content: "Channel update",
      createdAt: "2026-04-21T10:15:00.000Z",
      updatedAt: "2026-04-21T10:15:00.000Z",
    });

    useChatStore.setState({ channels: [channel] });
    const store = useChatStore.getState();
    store.upsertMessage(post);
    store.removeMessageForUser("post-1", "channel-1", true);

    const nextChannel = useChatStore.getState().channels[0];
    expect(nextChannel.lastPost).toBeNull();
  });
});
