import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

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

export default router;
