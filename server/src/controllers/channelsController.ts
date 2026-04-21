import { nanoid } from "nanoid";

import { Channel } from "../models/Channel";
import { validateUploadedFile } from "../middleware/upload";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError, sendSuccess } from "../utils/http";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const serializeChannel = (channel: any) => ({
  id: channel._id.toString(),
  name: channel.name,
  slug: channel.slug,
  description: channel.description,
  avatarUrl: channel.avatarUrl,
  visibility: channel.visibility,
  ownerId: channel.ownerId.toString(),
  admins: channel.admins.map((admin: any) => admin.toString()),
  members: channel.members.map((member: any) => member.toString()),
  inviteCode: channel.inviteCode,
  mutedBy: channel.mutedBy.map((userId: any) => userId.toString()),
  lastPost: channel.lastPost,
  subscriberCount: channel.members.length,
  createdAt: channel.createdAt,
});

const ensureChannelAdmin = (channel: any, userId: string) => {
  const isAdmin =
    channel.ownerId.toString() === userId ||
    channel.admins.some((adminId: any) => adminId.toString() === userId);

  if (!isAdmin) {
    throw new AppError("You must be a channel admin to do that.", 403);
  }
};

export const discoverChannels = asyncHandler(async (req, res) => {
  const query = String(req.query.q ?? "").trim();

  const channels = await Channel.find({
    visibility: "public",
    ...(query
      ? {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { slug: { $regex: query, $options: "i" } },
          ],
        }
      : {}),
  })
    .sort({ updatedAt: -1 })
    .limit(30);

  sendSuccess(res, {
    channels: channels.map(serializeChannel),
  });
});

export const getMyChannels = asyncHandler(async (req, res) => {
  const channels = await Channel.find({
    members: req.user!._id,
  }).sort({ updatedAt: -1 });

  sendSuccess(res, { channels: channels.map(serializeChannel) });
});

export const getChannelBySlug = asyncHandler(async (req, res) => {
  const channel = await Channel.findOne({
    $or: [{ slug: req.params.channelIdOrSlug }, { _id: req.params.channelIdOrSlug }],
  });

  if (!channel) {
    throw new AppError("Channel not found.", 404);
  }

  const isMember = channel.members.some(
    (memberId) => memberId.toString() === req.userId,
  );

  if (channel.visibility === "private" && !isMember) {
    throw new AppError("You do not have access to this channel.", 403);
  }

  sendSuccess(res, { channel: serializeChannel(channel) });
});

export const createChannel = asyncHandler(async (req, res) => {
  const baseSlug = slugify(req.body.slug || req.body.name);

  if (!req.body.name || !baseSlug) {
    throw new AppError("Channel name is required.");
  }

  const existingSlug = await Channel.findOne({ slug: baseSlug });
  const slug = existingSlug ? `${baseSlug}-${nanoid(6).toLowerCase()}` : baseSlug;

  let avatarUrl = "";
  let avatarPublicId = "";

  if (req.file) {
    validateUploadedFile(req.file);
    const upload = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "pulse/channel-avatars",
      resourceType: "image",
      filename: `${slug}-${Date.now()}`,
    });
    avatarUrl = upload.secure_url;
    avatarPublicId = upload.public_id;
  }

  const channel = await Channel.create({
    name: req.body.name,
    slug,
    description: req.body.description ?? "",
    avatarUrl,
    avatarPublicId,
    visibility: req.body.visibility === "private" ? "private" : "public",
    ownerId: req.user!._id,
    admins: [req.user!._id],
    members: [req.user!._id],
    inviteCode: nanoid(12),
  });

  sendSuccess(res, { channel: serializeChannel(channel) }, 201);
});

export const joinChannel = asyncHandler(async (req, res) => {
  const channel =
    req.body.inviteCode
      ? await Channel.findOne({ inviteCode: req.body.inviteCode })
      : await Channel.findById(req.params.channelId);

  if (!channel) {
    throw new AppError("Channel not found.", 404);
  }

  if (channel.visibility === "private" && !req.body.inviteCode) {
    throw new AppError("This channel requires an invite.", 403);
  }

  if (!channel.members.some((member) => member.toString() === req.userId)) {
    channel.members.push(req.user!._id);
    await channel.save();
  }

  sendSuccess(res, { channel: serializeChannel(channel) });
});

export const joinChannelViaInvite = asyncHandler(async (req, res) => {
  const inviteCode = String(req.body.inviteCode ?? "").trim();

  if (!inviteCode) {
    throw new AppError("Invite code is required.");
  }

  const channel = await Channel.findOne({ inviteCode });

  if (!channel) {
    throw new AppError("Invite code is invalid.", 404);
  }

  if (!channel.members.some((member) => member.toString() === req.userId)) {
    channel.members.push(req.user!._id);
    await channel.save();
  }

  sendSuccess(res, { channel: serializeChannel(channel) });
});

export const leaveChannel = asyncHandler(async (req, res) => {
  const channel = await Channel.findById(req.params.channelId);

  if (!channel) {
    throw new AppError("Channel not found.", 404);
  }

  if (channel.ownerId.toString() === req.userId) {
    throw new AppError("The channel owner cannot leave without transferring ownership.", 400);
  }

  channel.members = channel.members.filter(
    (member) => member.toString() !== req.userId,
  ) as any;
  channel.admins = channel.admins.filter(
    (adminId) => adminId.toString() !== req.userId,
  ) as any;
  channel.mutedBy = channel.mutedBy.filter(
    (userId) => userId.toString() !== req.userId,
  ) as any;

  await channel.save();

  sendSuccess(res, { channel: serializeChannel(channel) });
});

export const toggleMuteChannel = asyncHandler(async (req, res) => {
  const channel = await Channel.findById(req.params.channelId);

  if (!channel) {
    throw new AppError("Channel not found.", 404);
  }

  const isMuted = channel.mutedBy.some(
    (userId) => userId.toString() === req.userId,
  );

  channel.mutedBy = isMuted
    ? (channel.mutedBy.filter((userId) => userId.toString() !== req.userId) as any)
    : ([...channel.mutedBy, req.user!._id] as any);

  await channel.save();

  sendSuccess(res, { muted: !isMuted });
});

export const updateChannel = asyncHandler(async (req, res) => {
  const channel = await Channel.findById(req.params.channelId);

  if (!channel) {
    throw new AppError("Channel not found.", 404);
  }

  ensureChannelAdmin(channel, req.userId!);

  if (req.file) {
    validateUploadedFile(req.file);
    const upload = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "pulse/channel-avatars",
      resourceType: "image",
      filename: `${channel.slug}-${Date.now()}`,
    });
    channel.avatarUrl = upload.secure_url;
    channel.avatarPublicId = upload.public_id;
  }

  if (req.body.name) {
    channel.name = req.body.name;
  }

  if (typeof req.body.description === "string") {
    channel.description = req.body.description;
  }

  if (req.body.visibility === "public" || req.body.visibility === "private") {
    channel.visibility = req.body.visibility;
  }

  await channel.save();

  sendSuccess(res, { channel: serializeChannel(channel) });
});
