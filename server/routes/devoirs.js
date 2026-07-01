import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { sendPushToGroup } from "../utils/push.js";

const router = Router();

// GET /devoirs — liste les devoirs du groupe de l'utilisateur connecté
router.get("/", requireAuth, async (req, res) => {
  const devoirs = await prisma.devoir.findMany({
    where: { groupeId: req.user.groupeId },
    orderBy: { dateLimite: "asc" },
    include: { auteur: { select: { nom: true } } },
  });
  res.json(devoirs);
});

// POST /devoirs — crée un devoir (admin ou délégué seulement)
router.post("/", requireAuth, requireRole("admin", "delegue"), async (req, res) => {
  const { titre, matiere, description, dateLimite } = req.body;
  if (!titre || !matiere || !dateLimite) {
    return res.status(400).json({ error: "Titre, matière et date limite sont requis." });
  }

  const devoir = await prisma.devoir.create({
    data: {
      titre,
      matiere,
      description,
      dateLimite: new Date(dateLimite),
      groupeId: req.user.groupeId,
      auteurId: req.user.id,
    },
    include: { auteur: { select: { nom: true } } },
  });

  // Temps réel Socket.IO
  req.io.to(`groupe-${req.user.groupeId}`).emit("nouveauDevoir", devoir);

  // Notification push aux membres du groupe
  sendPushToGroup(req.user.groupeId, req.user.id, {
    title: `Nouveau devoir — ${devoir.matiere}`,
    body: devoir.titre,
    url: "/devoirs",
    tag: `devoir-${devoir.id}`,
  });

  res.status(201).json(devoir);
});

// DELETE /devoirs/:id — supprime un devoir (admin ou délégué seulement)
router.delete("/:id", requireAuth, requireRole("admin", "delegue"), async (req, res) => {
  const devoir = await prisma.devoir.findUnique({ where: { id: Number(req.params.id) } });
  if (!devoir) return res.status(404).json({ error: "Devoir introuvable." });
  if (devoir.groupeId !== req.user.groupeId) return res.status(403).json({ error: "Accès refusé." });

  await prisma.devoir.delete({ where: { id: Number(req.params.id) } });

  req.io.to(`groupe-${req.user.groupeId}`).emit("devoirSupprime", { id: Number(req.params.id) });

  res.json({ message: "Devoir supprimé." });
});

export default router;
