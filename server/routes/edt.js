import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();

// GET /edt/groupes — liste des groupes (id + nom + promo), pour choisir quel EDT
// consulter. La promo est nécessaire pour distinguer deux groupes de même nom
// dans des promos différentes (ex. TDA1 en MMI2 et TDA1 en MMI3).
router.get("/groupes", requireAuth, async (req, res) => {
  const groupes = await prisma.groupe.findMany({
    select: { id: true, nom: true, promo: true },
    orderBy: [{ promo: "asc" }, { nom: "asc" }],
  });
  res.json(groupes);
});

// GET /edt?groupeId=X — cours du groupe demandé (celui de l'utilisateur par défaut),
// à partir d'il y a 7 jours pour garder un peu d'historique récent visible en plus du
// futur. L'EDT n'est pas une donnée sensible : n'importe quel groupe peut consulter
// l'EDT d'un autre (ex. voir quand des amis dans un autre groupe finissent leurs cours).
router.get("/", requireAuth, async (req, res) => {
  const groupeId = req.query.groupeId ? Number(req.query.groupeId) : req.user.groupeId;

  const depuis = new Date();
  depuis.setDate(depuis.getDate() - 7);

  const cours = await prisma.cours.findMany({
    where: { groupeId, dateFin: { gte: depuis } },
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
