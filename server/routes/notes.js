import { Router } from "express";
import prisma from "../db.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// GET /notes — notes de l'utilisateur connecté
router.get("/", requireAuth, async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(notes);
});

// POST /notes — ajoute une note
router.post("/", requireAuth, async (req, res) => {
  const { matiere, valeur, coefficient } = req.body;
  if (!matiere || valeur === undefined) {
    return res.status(400).json({ error: "Matière et valeur sont requis." });
  }
  if (valeur < 0 || valeur > 20) {
    return res.status(400).json({ error: "La note doit être entre 0 et 20." });
  }

  const note = await prisma.note.create({
    data: { matiere, valeur: Number(valeur), coefficient: Number(coefficient ?? 1), userId: req.user.id },
  });
  res.status(201).json(note);
});

// DELETE /notes/:id — supprime une note
router.delete("/:id", requireAuth, async (req, res) => {
  const note = await prisma.note.findUnique({ where: { id: Number(req.params.id) } });
  if (!note) return res.status(404).json({ error: "Note introuvable." });
  if (note.userId !== req.user.id) return res.status(403).json({ error: "Accès refusé." });

  await prisma.note.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: "Note supprimée." });
});

export default router;
