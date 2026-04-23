/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope;

self.addEventListener("install", () => {
  self.skipWaiting();
});

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() ?? {
    title: "Pulse",
    body: "You have a new notification.",
    data: {},
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Pulse", {
      body: payload.body ?? "You have a new notification.",
      icon: "/icons/pulse-192.png",
      badge: "/icons/pulse-192.png",
      data: payload.data ?? {},
      tag: payload.data?.chatId ?? payload.data?.channelId ?? "pulse-notification",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath =
    event.notification.data?.chatId
      ? `/chat/${event.notification.data.chatId}`
      : event.notification.data?.channelId
        ? `/channels/${event.notification.data.channelId}`
        : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);

      if (existingClient) {
        existingClient.navigate(targetPath);
        return existingClient.focus();
      }

      return self.clients.openWindow(targetPath);
    }),
  );
});
