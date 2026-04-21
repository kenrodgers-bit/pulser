import type { Server } from "socket.io";

import { Notification } from "../models/Notification";
import { User } from "../models/User";
import { sendPushNotification } from "./pushNotification";
import { serializeNotification } from "./serializers";

export const notifyUser = async (options: {
  io?: Server;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) => {
  const notification = await Notification.create({
    userId: options.userId,
    type: options.type,
    title: options.title,
    body: options.body,
    data: options.data ?? {},
  });

  const user = await User.findById(options.userId);

  if (options.io) {
    options.io
      .to(`user:${options.userId}`)
      .emit("notification:new", serializeNotification(notification));
  }

  if (user?.notificationSettings?.pushEnabled) {
    await sendPushNotification(
      user.pushSubscriptions.map((subscription: any) => ({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
        },
      })),
      {
      title: options.title,
      body: options.body,
      data: options.data ?? {},
      },
    );
  }

  return notification;
};
