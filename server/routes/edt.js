import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

// GET /edt — cours du groupe de l'utilisateur connecté
router.get("/", requireAuth, async (req, res) => {
  const cours = await prisma.cours.findMany({
    where: { groupeId: req.user.groupeId },
    orderBy: [{ jour: "asc" }, { heureDebut: "asc" }],
  });
  res.json(cours);
});

// POST /edt — ajoute un cours (admin seulement)
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { matiere, jour, heureDebut, heureFin, salle, prof, groupeId } = req.body;
  if (!matiere || !jour || !heureDebut || !heureFin) {
    return res.status(400).json({ error: "Matière, jour et horaires sont requis." });
  }

  const cours = await prisma.cours.create({
    data: {
      matiere,
      jour,
      heureDebut,
      heureFin,
      salle: salle ?? null,
      prof: prof ?? null,
      groupeId: groupeId ?? req.user.groupeId,
    },
  });
  res.status(201).json(cours);
});

// DELETE /edt/:id — supprime un cours (admin seulement)
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const cours = await prisma.cours.findUnique({ where: { id: Number(req.params.id) } });
  if (!cours) return res.status(404).json({ error: "Cours introuvable." });

  await prisma.cours.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: "Cours supprimé." });
});

export default router;
