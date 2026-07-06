import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

const sondageInclude = {
  auteur: { select: { id: true, nom: true } },
  options: {
    include: {
      votes: { select: { userId: true } },
    },
  },
};

// GET /sondages/channel/:channelId
router.get("/channel/:channelId", async (req, res) => {
  const channelId = Number(req.params.channelId);
  const sondages = await prisma.sondage.findMany({
    where: { channelId },
    include: sondageInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(sondages);
});

// POST /sondages — admin ou délégué
router.post("/", requireRole("admin", "delegue"), async (req, res) => {
  const { question, options, channelId } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: "Question requise." });
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
    return res.status(400).json({ error: "2 à 6 options requises." });
  }
  if (!channelId) return res.status(400).json({ error: "Canal requis." });

  const sondage = await prisma.sondage.create({
    data: {
      question: question.trim(),
      auteurId: req.user.id,
      channelId: Number(channelId),
      options: {
        create: options.map((t) => ({ texte: t.trim() })).filter((o) => o.texte),
      },
    },
    include: sondageInclude,
  });

  req.io.to(`channel-${channelId}`).emit("nouveauSondage", sondage);
  res.status(201).json(sondage);
});

// POST /sondages/:id/vote
router.post("/:id/vote", async (req, res) => {
  const sondageId = Number(req.params.id);
  const { optionId } = req.body;
  const userId = req.user.id;

  const sondage = await prisma.sondage.findUnique({ where: { id: sondageId } });
  if (!sondage) return res.status(404).json({ error: "Sondage introuvable." });
  if (sondage.clos) return res.status(403).json({ error: "Sondage clos." });

  const option = await prisma.optionSondage.findUnique({ where: { id: Number(optionId) } });
  if (!option || option.sondageId !== sondageId) {
    return res.status(400).json({ error: "Option invalide." });
  }

  // Supprimer vote existant puis recréer (changement de vote autorisé)
  await prisma.voteSondage.deleteMany({ where: { userId, sondageId } });
  await prisma.voteSondage.create({ data: { userId, optionId: Number(optionId), sondageId } });

  const updated = await prisma.sondage.findUnique({ where: { id: sondageId }, include: sondageInclude });
  req.io.to(`channel-${sondage.channelId}`).emit("sondageMaj", updated);
  res.json(updated);
});

// PATCH /sondages/:id/clore — admin ou auteur délégué
router.patch("/:id/clore", requireRole("admin", "delegue"), async (req, res) => {
  const sondageId = Number(req.params.id);
  const sondage = await prisma.sondage.findUnique({ where: { id: sondageId } });
  if (!sondage) return res.status(404).json({ error: "Sondage introuvable." });
  if (req.user.role !== "admin" && sondage.auteurId !== req.user.id) {
    return res.status(403).json({ error: "Interdit." });
  }
  const updated = await prisma.sondage.update({
    where: { id: sondageId },
    data: { clos: true },
    include: sondageInclude,
  });
  req.io.to(`channel-${sondage.channelId}`).emit("sondageMaj", updated);
  res.json(updated);
});

// DELETE /sondages/:id — admin ou auteur délégué
router.delete("/:id", requireRole("admin", "delegue"), async (req, res) => {
  const sondageId = Number(req.params.id);
  const sondage = await prisma.sondage.findUnique({ where: { id: sondageId } });
  if (!sondage) return res.status(404).json({ error: "Sondage introuvable." });
  if (req.user.role !== "admin" && sondage.auteurId !== req.user.id) {
    return res.status(403).json({ error: "Interdit." });
  }
  await prisma.sondage.delete({ where: { id: sondageId } });
  req.io.to(`channel-${sondage.channelId}`).emit("sondageSupprime", { id: sondageId });
  res.json({ message: "Sondage supprimé." });
});

export default router;
