import webpush from "web-push";

import { env } from "../config/env";

const webPushReady =
  Boolean(env.webPush.publicKey) &&
  Boolean(env.webPush.privateKey) &&
  Boolean(env.webPush.subject);

if (webPushReady) {
  webpush.setVapidDetails(
    env.webPush.subject,
    env.webPush.publicKey,
    env.webPush.privateKey,
  );
}

export const sendPushNotification = async (
  subscriptions: Array<{
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  }>,
  payload: Record<string, unknown>,
) => {
  if (!webPushReady || subscriptions.length === 0) {
    return;
  }

  await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(subscription as any, JSON.stringify(payload)),
    ),
  );
};
