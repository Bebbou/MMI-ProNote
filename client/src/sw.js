import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Mise à jour automatique (registerType: "autoUpdate") : une nouvelle version s'active tout
// de suite au lieu d'attendre que tous les onglets soient fermés. Sans ça, un correctif du
// service worker n'arrive jamais chez ceux qui ont déjà l'application ouverte.
self.skipWaiting();
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() ?? "" }; // payload qui n'est pas du JSON : on l'affiche tel quel
  }
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
