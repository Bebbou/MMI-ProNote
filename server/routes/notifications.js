import { Router } from "express";
import prisma from "../db.js";
import { requireAuth } from "../middlewares/auth.js";

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

export default router;
