import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { sendPushToGroup } from "../utils/push.js";

const router = Router();

// GET /devoirs — liste les devoirs du groupe de l'utilisateur connecté, avec
// pour chacun si LUI (pas le groupe) l'a marqué comme rendu
router.get("/", requireAuth, async (req, res) => {
  const devoirs = await prisma.devoir.findMany({
    where: { groupeId: req.user.groupeId },
    orderBy: { dateLimite: "asc" },
    include: {
      auteur: { select: { nom: true } },
      rendus: { where: { userId: req.user.id }, select: { id: true } },
    },
  });
  res.json(devoirs.map(({ rendus, ...d }) => ({ ...d, rendu: rendus.length > 0 })));
});

// POST /devoirs/:id/rendu — bascule "j'ai rendu ce devoir" pour l'utilisateur connecté
// (état personnel : ne touche pas aux autres membres du groupe)
router.post("/:id/rendu", requireAuth, async (req, res) => {
  const devoirId = Number(req.params.id);
  const devoir = await prisma.devoir.findUnique({ where: { id: devoirId } });
  if (!devoir) return res.status(404).json({ error: "Devoir introuvable." });
  if (devoir.groupeId !== req.user.groupeId) return res.status(403).json({ error: "Accès refusé." });

  const existant = await prisma.devoirRendu.findUnique({
    where: { devoirId_userId: { devoirId, userId: req.user.id } },
  });

  if (existant) {
    await prisma.devoirRendu.delete({ where: { id: existant.id } });
    return res.json({ rendu: false });
  }

  await prisma.devoirRendu.create({ data: { devoirId, userId: req.user.id } });
  res.json({ rendu: true });
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
  const date = new Date(devoir.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  sendPushToGroup(req.user.groupeId, req.user.id, {
    title: `Nouveau devoir · ${devoir.matiere}`,
    body: `${devoir.titre} — à rendre pour le ${date}`,
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
