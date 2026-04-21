import type { Server } from "socket.io";

import { Story } from "../models/Story";
import { User } from "../models/User";
import {
  createMessageEntry,
  emitMessageToParticipants,
} from "../controllers/messagesController";
import { validateUploadedFile } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";
import { getOrCreateDirectChat } from "../utils/chatHelpers";
import {
  buildMediaPreviewUrl,
  uploadBufferToCloudinary,
} from "../utils/cloudinaryUpload";
import { AppError, sendSuccess } from "../utils/http";
import { notifyUser } from "../utils/notifications";
import { serializeMessage, serializeStory } from "../utils/serializers";

export const getStories = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select("friends");
  const allowedUserIds = [req.user!._id, ...(user?.friends ?? [])];

  const stories = await Story.find({
    userId: { $in: allowedUserIds },
    expiresAt: { $gt: new Date() },
  })
    .populate("userId", "username displayName avatarUrl")
    .populate("viewers.userId", "username displayName avatarUrl")
    .sort({ createdAt: -1 });

  const grouped = new Map<string, any>();

  for (const story of stories) {
    const userInfo = story.userId as any;
    const key = userInfo._id.toString();

    if (!grouped.has(key)) {
      grouped.set(key, {
        user: {
          id: userInfo._id.toString(),
          username: userInfo.username,
          displayName: userInfo.displayName,
          avatarUrl: userInfo.avatarUrl,
        },
        stories: [],
      });
    }

    grouped.get(key).stories.push(serializeStory(story));
  }

  sendSuccess(res, {
    stories: Array.from(grouped.values()),
  });
});

export const createStory = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("A photo or video is required.");
  }

  validateUploadedFile(req.file);
  const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";
  const upload = await uploadBufferToCloudinary(req.file.buffer, {
    folder: "pulse/stories",
    resourceType: mediaType,
    filename: `${req.user!.username}-story-${Date.now()}`,
  });

  const story = await Story.create({
    userId: req.user!._id,
    mediaUrl: upload.secure_url,
    publicId: upload.public_id,
    mediaType,
    thumbnailUrl:
      mediaType === "video"
        ? buildMediaPreviewUrl(upload.public_id, "video")
        : upload.secure_url,
    caption: req.body.caption ?? "",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const io = req.app.get("io") as Server | undefined;
  io?.emit("new_story", serializeStory(story));

  sendSuccess(res, { story: serializeStory(story) }, 201);
});

export const markStoryViewed = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.storyId);

  if (!story) {
    throw new AppError("Story not found.", 404);
  }

  if (!story.viewers.some((viewer) => viewer.userId.toString() === req.userId)) {
    story.viewers.push({
      userId: req.user!._id,
      viewedAt: new Date(),
    } as any);
    await story.save();
  }

  sendSuccess(res, { story: serializeStory(story) });
});

export const reactToStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.storyId);

  if (!story) {
    throw new AppError("Story not found.", 404);
  }

  const emoji = String(req.body.emoji ?? "").trim();

  if (!emoji) {
    throw new AppError("A reaction emoji is required.");
  }

  story.reactions = story.reactions.filter(
    (reaction) => reaction.userId.toString() !== req.userId,
  ) as any;
  story.reactions.push({
    userId: req.user!._id,
    emoji,
    createdAt: new Date(),
  } as any);
  await story.save();

  if (story.userId.toString() !== req.userId) {
    await notifyUser({
      io: req.app.get("io") as Server | undefined,
      userId: story.userId.toString(),
      type: "story_reaction",
      title: "Story reaction",
      body: `${req.user!.displayName} reacted to your story with ${emoji}`,
      data: {
        storyId: story._id.toString(),
      },
    });
  }

  sendSuccess(res, { story: serializeStory(story) });
});

export const replyToStory = asyncHandler(async (req, res) => {
  const story = await Story.findById(req.params.storyId);

  if (!story) {
    throw new AppError("Story not found.", 404);
  }

  const content = String(req.body.content ?? "").trim();

  if (!content) {
    throw new AppError("Reply content is required.");
  }

  const chat = await getOrCreateDirectChat(req.userId!, story.userId.toString());
  const payload = await createMessageEntry({
    userId: req.userId!,
    chatId: chat._id.toString(),
    content,
  });

  await emitMessageToParticipants(req.app.get("io") as Server | undefined, payload);

  sendSuccess(
    res,
    {
      message: serializeMessage(payload.message, req.userId!),
      chatId: chat._id.toString(),
    },
    201,
  );
});
