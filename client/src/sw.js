import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Pronote-MMI", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag ?? "default",
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
