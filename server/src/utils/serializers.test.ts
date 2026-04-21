import { describe, expect, it } from "vitest";
import { Types } from "mongoose";

import { serializeMessage } from "./serializers";

const makeMessage = (overrides: Record<string, unknown> = {}) => {
  const senderId = new Types.ObjectId();
  const recipientId = new Types.ObjectId();

  return {
    message: {
      _id: new Types.ObjectId(),
      chatId: new Types.ObjectId(),
      channelId: null,
      senderId: {
        _id: senderId,
        username: "kenny",
        displayName: "Kenny",
        avatarUrl: "",
      },
      type: "image",
      content: "https://cdn.example.com/file.jpg",
      viewMode: "once",
      viewedBy: [],
      deliveredTo: [senderId],
      readBy: [senderId],
      replyTo: null,
      reactions: [],
      deletedFor: [],
      deletedForEveryoneAt: null,
      editedAt: null,
      createdAt: "2026-04-21T10:00:00.000Z",
      updatedAt: "2026-04-21T10:00:00.000Z",
      metadata: {
        originalName: "story.jpg",
      },
      ...overrides,
    },
    senderId: senderId.toString(),
    recipientId: recipientId.toString(),
  };
};

describe("serializeMessage", () => {
  it("hides view-once media content from recipients before opening", () => {
    const { message, recipientId } = makeMessage();

    const serialized = serializeMessage(message, recipientId);

    expect(serialized?.content).toBeNull();
    expect(serialized?.metadata?.isViewable).toBe(true);
    expect(serialized?.metadata?.wasOpened).toBe(false);
  });

  it("marks view-once media as opened for recipients who already viewed it", () => {
    const recipientObjectId = new Types.ObjectId();
    const { message } = makeMessage({
      viewedBy: [recipientObjectId],
    });

    const serialized = serializeMessage(message, recipientObjectId.toString());

    expect(serialized?.content).toBeNull();
    expect(serialized?.metadata?.isViewable).toBe(false);
    expect(serialized?.metadata?.wasOpened).toBe(true);
  });

  it("returns null when the message was deleted only for the current viewer", () => {
    const recipientObjectId = new Types.ObjectId();
    const { message } = makeMessage({
      deletedFor: [recipientObjectId],
    });

    expect(serializeMessage(message, recipientObjectId.toString())).toBeNull();
  });

  it("preserves media content for the sender", () => {
    const { message, senderId } = makeMessage();

    const serialized = serializeMessage(message, senderId);

    expect(serialized?.content).toBe("https://cdn.example.com/file.jpg");
    expect(serialized?.metadata?.isViewable).toBe(true);
  });
});
