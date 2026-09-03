import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

// GET /edt — cours du groupe de l'utilisateur connecté (à partir d'il y a 7 jours,
// pour garder un peu d'historique récent visible en plus du futur)
router.get("/", requireAuth, async (req, res) => {
  const depuis = new Date();
  depuis.setDate(depuis.getDate() - 7);

  const cours = await prisma.cours.findMany({
    where: { groupeId: req.user.groupeId, dateFin: { gte: depuis } },
    orderBy: { dateDebut: "asc" },
  });
  res.json(cours);
});

// POST /edt — ajoute un cours à la main (admin seulement, en plus de la sync iCal)
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { matiere, dateDebut, dateFin, salle, prof, groupeId } = req.body;
  if (!matiere || !dateDebut || !dateFin) {
    return res.status(400).json({ error: "Matière, date de début et date de fin sont requises." });
  }

  const cours = await prisma.cours.create({
    data: {
      matiere,
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
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
