import { Router } from "express";
import prisma from "../db.js";
import { requireAuth } from "../middlewares/auth.js";
import { sendPushToUsers } from "../utils/push.js";

const router = Router();

// Préférences exposées au client -> colonnes en base
const CHAMPS_PREFS = {
  devoirs: "notifDevoirs",
  rappels: "notifRappels",
  cours: "notifCours",
  annonces: "notifAnnonces",
};

// GET /notifications — les 30 dernières de l'utilisateur et le nombre de non lues
router.get("/", requireAuth, async (req, res) => {
  const [items, nonLues] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, categorie: true, titre: true, corps: true, url: true, luAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: req.user.id, luAt: null } }),
  ]);
  res.json({ items, nonLues });
});

// POST /notifications/lues — marque tout comme lu
router.post("/lues", requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, luAt: null },
    data: { luAt: new Date() },
  });
  res.json({ nonLues: 0 });
});

// GET /notifications/preferences
router.get("/preferences", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: Object.fromEntries(Object.values(CHAMPS_PREFS).map((c) => [c, true])),
  });
  res.json(Object.fromEntries(Object.entries(CHAMPS_PREFS).map(([cle, col]) => [cle, user[col]])));
});

// PUT /notifications/preferences — { devoirs?: bool, rappels?: bool, cours?: bool, annonces?: bool }
router.put("/preferences", requireAuth, async (req, res) => {
  const data = {};
  for (const [cle, col] of Object.entries(CHAMPS_PREFS)) {
    if (typeof req.body[cle] === "boolean") data[col] = req.body[cle];
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: "Aucune préférence valide." });

  await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ message: "Préférences enregistrées." });
});

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
      title: "Pronote-MMI",
      body: "Les notifications fonctionnent correctement !",
      url: "/dashboard",
      tag: "test",
    });
    res.json({ message: "Notif envoyée.", endpoint: sub.endpoint.slice(0, 50) + "…" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
