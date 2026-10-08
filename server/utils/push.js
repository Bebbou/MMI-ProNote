import webpush from "web-push";
import prisma from "../db.js";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? "contact@example.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendToSubs(subscriptions, payload) {
  console.log(`[push] envoi à ${subscriptions.length} abonnement(s)`);
  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .then(() => console.log(`[push] OK → ${sub.endpoint.slice(0, 40)}…`))
        .catch(async (err) => {
          console.error(`[push] ERREUR ${err.statusCode} → ${err.message}`);
          // Abonnement expiré ou révoqué côté navigateur : inutile de le garder
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        })
    )
  );
}

// Envoie le push aux appareils de ces utilisateurs. Les destinataires, leurs préférences et
// l'historique sont gérés par utils/notifier.js : n'appelle pas ceci directement.
export async function sendPushToUsers(userIds, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  await sendToSubs(subs, payload);
}
