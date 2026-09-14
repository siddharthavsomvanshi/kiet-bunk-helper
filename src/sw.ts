/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

// 1. Precaching & Outdated Cache Cleanup
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// 2. Navigation Routing with API Denylist
const navigationRoute = new NavigationRoute(createHandlerBoundToURL("index.html"), {
  denylist: [/^\/api/],
});
registerRoute(navigationRoute);

// 3. Skip Waiting & Clients Claim for immediate activation/update
self.skipWaiting();
clientsClaim();

// 4. Web Push Event Listener
self.addEventListener("push", (event: PushEvent) => {
  let payload = {
    title: "KIET Bunk Helper",
    body: "You have a new notification.",
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: {
      url: "/",
    },
  };

  if (event.data) {
    try {
      const json = event.data.json();
      payload = {
        title: json.title || payload.title,
        body: json.body || payload.body,
        icon: json.icon || payload.icon,
        badge: json.badge || payload.badge,
        data: {
          url: json.data?.url || payload.data.url,
          ...json.data,
        },
      };
    } catch {
      const text = event.data.text();
      if (text) {
        payload.body = text;
      }
    }
  }

  const notificationOptions: NotificationOptions = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    data: payload.data,
    tag: "attendance-notification",
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// 5. Notification Click Event Listener
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
