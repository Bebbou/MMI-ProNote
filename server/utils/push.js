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
          if (err.statusCode === 410 || err.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        })
    )
  );
}

export async function sendPushToGroup(groupeId, excludeUserId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { user: { groupeId, id: { not: excludeUserId } } },
  });
  console.log(`[push] sendPushToGroup groupeId=${groupeId} subs trouvés=${subs.length}`);
  await sendToSubs(subs, payload);
}

export async function sendPushToAll(excludeUserId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { user: { valide: true, id: { not: excludeUserId } } },
  });
  await sendToSubs(subs, payload);
}

export async function sendPushToUsers(userIds, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  await sendToSubs(subs, payload);
}
