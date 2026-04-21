import { Notification } from "../models/Notification";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError, sendSuccess } from "../utils/http";
import { serializeNotification } from "../utils/serializers";

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    userId: req.user!._id,
  })
    .sort({ createdAt: -1 })
    .limit(50);

  sendSuccess(res, {
    notifications: notifications.map(serializeNotification),
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    userId: req.user!._id,
  });

  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  sendSuccess(res, { notification: serializeNotification(notification) });
});
