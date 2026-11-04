import { Router } from "express";
import prisma from "../db.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

const COEFFICIENT_MAX = 100;

// Number("") vaut 0 et Number(true) vaut 1 : seuls les nombres et les textes non vides
// sont acceptés, le reste donne NaN et sera refusé par la validation.
function enNombre(valeur) {
  if (typeof valeur === "number") return valeur;
  if (typeof valeur === "string" && valeur.trim() !== "") return Number(valeur);
  return NaN;
}

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
  const valeurNote = enNombre(valeur);
  if (!Number.isFinite(valeurNote) || valeurNote < 0 || valeurNote > 20) {
    return res.status(400).json({ error: "La note doit être entre 0 et 20." });
  }

  // Le coefficient est facultatif : laissé vide, il vaut 1
  const coefficientVide = coefficient === undefined || coefficient === null || coefficient === "";
  const coefficientNote = coefficientVide ? 1 : enNombre(coefficient);
  if (!Number.isFinite(coefficientNote) || coefficientNote <= 0 || coefficientNote > COEFFICIENT_MAX) {
    return res
      .status(400)
      .json({ error: `Le coefficient doit être supérieur à 0 et au plus ${COEFFICIENT_MAX}.` });
  }

  const note = await prisma.note.create({
    data: { matiere, valeur: valeurNote, coefficient: coefficientNote, userId: req.user.id },
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
