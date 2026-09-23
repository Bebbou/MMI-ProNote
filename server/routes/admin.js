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
  // Un admin ne peut pas se rétrograder lui-même : ça pourrait laisser
  // l'application sans aucun admin pour gérer les comptes (issue #27)
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "Tu ne peux pas modifier ton propre rôle." });
  }
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { role },
  });
  res.json({ message: `Rôle de ${user.nom} mis à jour : ${user.role}` });
});

// PATCH /admin/users/:id — modifie nom, email, groupe d'un utilisateur
router.patch("/users/:id", async (req, res) => {
  const { nom, email, groupeId } = req.body;
  const data = {};
  if (nom) data.nom = nom;
  if (email) data.email = email;
  if (groupeId) {
    const groupe = await prisma.groupe.findUnique({ where: { id: Number(groupeId) } });
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
  // Un admin ne peut pas se supprimer lui-même : ça pourrait laisser
  // l'application sans aucun admin pour gérer les comptes (issue #27)
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: "Tu ne peux pas supprimer ton propre compte." });
  }
  await prisma.user.delete({ where: { id: Number(req.params.id) } });
  res.json({ message: "Utilisateur supprimé." });
});

// GET /admin/groupes — liste les groupes et leur config iCal
router.get("/groupes", async (req, res) => {
  const groupes = await prisma.groupe.findMany({ orderBy: [{ promo: "asc" }, { nom: "asc" }] });
  res.json(groupes);
});

// POST /admin/groupes — crée un nouveau groupe (ex. pour une nouvelle promo comme MMI3),
// entièrement depuis l'appli, sans script ni accès direct à la base
router.post("/groupes", async (req, res) => {
  const { nom, promo } = req.body;
  if (!nom?.trim() || !promo?.trim()) {
    return res.status(400).json({ error: "Nom et promo sont requis." });
  }

  const existant = await prisma.groupe.findUnique({
    where: { nom_promo: { nom: nom.trim(), promo: promo.trim() } },
  });
  if (existant) {
    return res.status(400).json({ error: `Le groupe "${nom}" existe déjà pour la promo "${promo}".` });
  }

  const groupe = await prisma.groupe.create({ data: { nom: nom.trim(), promo: promo.trim() } });

  // Crée aussi le canal "Annonces" de cette promo tout de suite, si c'est sa première
  // apparition — sinon il faudrait attendre le prochain redémarrage du serveur.
  await prisma.channel.upsert({
    where: { nom_promo: { nom: "Annonces", promo: groupe.promo } },
    update: {},
    create: {
      nom: "Annonces",
      description: `Annonces ${groupe.promo}`,
      type: "annonce",
      promo: groupe.promo,
    },
  });

  res.status(201).json(groupe);
});

// DELETE /admin/groupes/:id — supprime un groupe (uniquement s'il n'a plus aucun
// utilisateur, devoir ni cours rattaché)
router.delete("/groupes/:id", async (req, res) => {
  const id = Number(req.params.id);
  const groupe = await prisma.groupe.findUnique({
    where: { id },
    include: { _count: { select: { users: true, devoirs: true, cours: true } } },
  });
  if (!groupe) return res.status(404).json({ error: "Groupe introuvable." });

  const { users, devoirs, cours } = groupe._count;
  if (users + devoirs + cours > 0) {
    return res.status(400).json({
      error: `Impossible : ce groupe a encore ${users} compte(s), ${devoirs} devoir(s) et ${cours} cours rattachés.`,
    });
  }

  await prisma.groupe.delete({ where: { id } });
  res.json({ message: "Groupe supprimé." });
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
