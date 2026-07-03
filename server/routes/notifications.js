import { Router } from "express";
import prisma from "../db.js";
import { requireAuth } from "../middlewares/auth.js";
import { sendPushToUsers } from "../utils/push.js";

const router = Router();

// GET /notifications/vapid-public-key — clé publique pour le client
router.get("/vapid-public-key", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: "Notifications push non configurées." });
  res.json({ key });
});

// POST /notifications/subscribe — enregistre un abonnement push
router.post("/subscribe", requireAuth, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Abonnement invalide." });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: req.user.id },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: req.user.id },
  });

  res.json({ message: "Abonnement enregistré." });
});

// DELETE /notifications/subscribe — supprime un abonnement push
router.delete("/subscribe", requireAuth, async (req, res) => {
  const { endpoint } = req.body;
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: req.user.id },
  });
  res.json({ message: "Abonnement supprimé." });
});

// POST /notifications/test — envoie une notif test à soi-même
router.post("/test", requireAuth, async (req, res) => {
  const sub = await prisma.pushSubscription.findFirst({ where: { userId: req.user.id } });
  if (!sub) return res.status(404).json({ error: "Aucun abonnement trouvé en base pour cet utilisateur." });
  try {
    await sendPushToUsers([req.user.id], {
      title: "Test Pronote-MMI",
      body: "Les notifications fonctionnent !",
      url: "/dashboard",
      tag: "test",
    });
    res.json({ message: "Notif envoyée.", endpoint: sub.endpoint.slice(0, 50) + "…" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
