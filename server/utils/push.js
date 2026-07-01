import webpush from "web-push";
import prisma from "../db.js";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? "contact@example.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendPushToGroup(groupeId, excludeUserId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { groupeId, id: { not: excludeUserId } } },
  });

  await Promise.allSettled(
    subscriptions.map(sub =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch(async err => {
          // Supprimer les abonnements expirés ou invalides
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        })
    )
  );
}
