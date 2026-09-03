import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { syncUnGroupe } from "../services/edtSync.js";

const router = Router();

// Toutes les routes admin nécessitent d'être connecté ET d'avoir le rôle admin
router.use(requireAuth, requireRole("admin"));

// GET /admin/users — liste tous les utilisateurs
router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, nom: true, email: true, role: true, valide: true, groupe: true },
  });
  res.json(users);
});

// PATCH /admin/users/:id/valider — valide un compte
router.patch("/users/:id/valider", async (req, res) => {
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { valide: true },
  });
  res.json({ message: `Compte de ${user.nom} validé.` });
});

// PATCH /admin/users/:id/role — change le rôle d'un utilisateur
router.patch("/users/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!["etudiant", "delegue", "admin"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide." });
  }
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { role },
  });
  res.json({ message: `Rôle de ${user.nom} mis à jour : ${user.role}` });
});

// PATCH /admin/users/:id — modifie nom, email, groupe d'un utilisateur
router.patch("/users/:id", async (req, res) => {
  const { nom, email, groupeNom } = req.body;
  const data = {};
  if (nom) data.nom = nom;
  if (email) data.email = email;
  if (groupeNom) {
    const groupe = await prisma.groupe.findUnique({ where: { nom: groupeNom } });
    if (!groupe) return res.status(400).json({ error: "Groupe introuvable." });
    data.groupeId = groupe.id;
  }
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data,
    include: { groupe: true },
  });
  res.json(user);
});

// DELETE /admin/users/:id — supprime un utilisateur
router.delete("/users/:id", async (req, res) => {
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: "Utilisateur supprimé." });
});

// GET /admin/groupes — liste les groupes et leur config iCal
router.get("/groupes", async (req, res) => {
  const groupes = await prisma.groupe.findMany({ orderBy: { nom: "asc" } });
  res.json(groupes);
});

// PATCH /admin/groupes/:id — modifie le flux iCal d'un groupe
router.patch("/groupes/:id", async (req, res) => {
  const { icalUrl } = req.body;
  const groupe = await prisma.groupe.update({
    where: { id: Number(req.params.id) },
    data: { icalUrl: icalUrl?.trim() || null },
  });
  res.json(groupe);
});

// POST /admin/groupes/:id/sync-edt — force une resynchronisation immédiate du groupe
router.post("/groupes/:id/sync-edt", async (req, res) => {
  try {
    const resultat = await syncUnGroupe(Number(req.params.id));
    res.json(resultat);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
