import type { Server } from "socket.io";

import { User } from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError, sendSuccess } from "../utils/http";
import { notifyUser } from "../utils/notifications";
import { serializeUser } from "../utils/serializers";
import { normalizeUsernameInput } from "../utils/username";

const mapRelationshipState = (currentUser: any, targetId: string) => {
  if (currentUser.friends.some((friend: any) => friend.toString() === targetId)) {
    return "friends";
  }

  if (
    currentUser.friendRequestsSent.some(
      (userId: any) => userId.toString() === targetId,
    )
  ) {
    return "pending";
  }

  if (
    currentUser.friendRequestsReceived.some(
      (userId: any) => userId.toString() === targetId,
    )
  ) {
    return "received";
  }

  return "none";
};

export const searchUsers = asyncHandler(async (req, res) => {
  const query = String(req.query.q ?? "").trim();

  if (!query) {
    sendSuccess(res, { users: [] });
    return;
  }

  const currentUser = req.user;
  const users = await User.find({
    _id: { $ne: currentUser._id },
    username: {
      $regex: query,
      $options: "i",
    },
  })
    .limit(20)
    .sort({ username: 1 });

  sendSuccess(res, {
    users: users.map((user) => ({
      ...serializeUser(user as any, req.userId),
      relationship: mapRelationshipState(currentUser, user._id.toString()),
    })),
  });
});

export const checkUsernameAvailability = asyncHandler(async (req, res) => {
  const username = normalizeUsernameInput(String(req.query.username ?? ""));

  if (username.length < 3) {
    sendSuccess(res, {
      username,
      available: false,
      message: "Username must be at least 3 characters.",
    });
    return;
  }

  const conflict = await User.exists({
    username,
    _id: { $ne: req.user._id },
  });

  sendSuccess(res, {
    username,
    available: !conflict,
  });
});

export const getFriends = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.userId).populate(
    "friends",
    "username displayName avatarUrl bio",
  );

  sendSuccess(res, {
    friends: (currentUser?.friends ?? []).map((friend: any) => ({
      id: friend._id.toString(),
      username: friend.username,
      displayName: friend.displayName,
      avatarUrl: friend.avatarUrl,
      bio: friend.bio,
    })),
  });
});

export const getFriendRequests = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.userId)
    .populate("friendRequestsReceived", "username displayName avatarUrl bio")
    .populate("friendRequestsSent", "username displayName avatarUrl bio");

  sendSuccess(res, {
    received: (currentUser?.friendRequestsReceived ?? []).map((user: any) => ({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    })),
    sent: (currentUser?.friendRequestsSent ?? []).map((user: any) => ({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    })),
  });
});

export const sendFriendRequest = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const targetUser = await User.findById(req.params.userId);

  if (!targetUser) {
    throw new AppError("User not found.", 404);
  }

  if (targetUser._id.toString() === currentUser._id.toString()) {
    throw new AppError("You cannot send a friend request to yourself.");
  }

  if (
    currentUser.friends.some(
      (friend: any) => friend.toString() === targetUser._id.toString(),
    )
  ) {
    throw new AppError("You are already friends.");
  }

  if (
    currentUser.friendRequestsSent.some(
      (userId: any) => userId.toString() === targetUser._id.toString(),
    )
  ) {
    throw new AppError("Friend request already sent.");
  }

  currentUser.friendRequestsSent.push(targetUser._id);
  targetUser.friendRequestsReceived.push(currentUser._id);

  await Promise.all([currentUser.save(), targetUser.save()]);

  await notifyUser({
    io: req.app.get("io") as Server | undefined,
    userId: targetUser._id.toString(),
    type: "friend_request",
    title: "New friend request",
    body: `${currentUser.displayName} sent you a friend request.`,
    data: {
      fromUserId: currentUser._id.toString(),
    },
  });

  sendSuccess(res, { message: "Friend request sent." }, 201);
});

export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const requester = await User.findById(req.params.userId);

  if (!requester) {
    throw new AppError("User not found.", 404);
  }

  const receivedIndex = currentUser.friendRequestsReceived.findIndex(
    (userId: any) => userId.toString() === requester._id.toString(),
  );

  if (receivedIndex === -1) {
    throw new AppError("No pending request from that user.");
  }

  currentUser.friendRequestsReceived.splice(receivedIndex, 1);
  requester.friendRequestsSent = requester.friendRequestsSent.filter(
    (userId: any) => userId.toString() !== currentUser._id.toString(),
  ) as any;

  if (
    !currentUser.friends.some(
      (friend: any) => friend.toString() === requester._id.toString(),
    )
  ) {
    currentUser.friends.push(requester._id);
  }

  if (
    !requester.friends.some(
      (friend: any) => friend.toString() === currentUser._id.toString(),
    )
  ) {
    requester.friends.push(currentUser._id);
  }

  await Promise.all([currentUser.save(), requester.save()]);

  await notifyUser({
    io: req.app.get("io") as Server | undefined,
    userId: requester._id.toString(),
    type: "friend_request_accepted",
    title: "Friend request accepted",
    body: `${currentUser.displayName} accepted your friend request.`,
    data: {
      userId: currentUser._id.toString(),
    },
  });

  sendSuccess(res, { message: "Friend request accepted." });
});

export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const requester = await User.findById(req.params.userId);

  if (!requester) {
    throw new AppError("User not found.", 404);
  }

  currentUser.friendRequestsReceived = currentUser.friendRequestsReceived.filter(
    (userId: any) => userId.toString() !== requester._id.toString(),
  ) as any;
  requester.friendRequestsSent = requester.friendRequestsSent.filter(
    (userId: any) => userId.toString() !== currentUser._id.toString(),
  ) as any;

  await Promise.all([currentUser.save(), requester.save()]);

  sendSuccess(res, { message: "Friend request rejected." });
});

export const savePushSubscription = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const subscription = req.body.subscription;

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new AppError("Invalid push subscription payload.", 400);
  }

  currentUser.pushSubscriptions = currentUser.pushSubscriptions.filter(
    (item: any) => item.endpoint !== subscription.endpoint,
  ) as any;
  currentUser.pushSubscriptions.push(subscription);
  await currentUser.save();

  sendSuccess(res, { message: "Push subscription saved." }, 201);
});

export const getPushSubscriptions = asyncHandler(async (req, res) => {
  sendSuccess(res, {
    subscriptions: req.user.pushSubscriptions.map((subscription: any) => ({
      endpoint: subscription.endpoint,
      createdAt: subscription.createdAt,
    })),
  });
});

export const deletePushSubscription = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : "";

  currentUser.pushSubscriptions = endpoint
    ? (currentUser.pushSubscriptions.filter(
        (item: any) => item.endpoint !== endpoint,
      ) as any)
    : [];

  await currentUser.save();

  sendSuccess(res, {
    message: endpoint
      ? "Push subscription removed."
      : "All push subscriptions removed.",
  });
});

export const updateUsername = asyncHandler(async (req, res) => {
  const user = req.user;
  const username = normalizeUsernameInput(String(req.body.username ?? ""));

  if (username.length < 3) {
    throw new AppError("Username must be at least 3 characters.", 400);
  }

  const conflict = await User.exists({
    username,
    _id: { $ne: user._id },
  });

  if (conflict) {
    throw new AppError("That username is already taken.", 409);
  }

  user.username = username;
  user.usernameAutoGenerated = false;
  await user.save();

  sendSuccess(res, { user: serializeUser(user, user._id.toString()) });
});
