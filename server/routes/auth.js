import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db.js";

const router = Router();

// POST /auth/register — inscription
router.post("/register", async (req, res) => {
  const { nom, email, password, groupeNom } = req.body;

  if (!nom || !email || !password || !groupeNom) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  const groupe = await prisma.groupe.findUnique({ where: { nom: groupeNom } });
  if (!groupe) {
    return res.status(400).json({ error: "Groupe invalide." });
  }

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    return res.status(400).json({ error: "Email déjà utilisé." });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { nom, email, password: hash, groupeId: groupe.id },
  });

  res.status(201).json({ message: "Inscription en attente de validation.", userId: user.id });
});

// POST /auth/login — connexion
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { groupe: true },
  });

  if (!user) return res.status(401).json({ error: "Identifiants invalides." });
  if (!user.valide) return res.status(403).json({ error: "Compte en attente de validation." });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Identifiants invalides." });

  const token = jwt.sign(
    { id: user.id, role: user.role, groupeId: user.groupeId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: { id: user.id, nom: user.nom, role: user.role, groupe: user.groupe.nom },
  });
});

export default router;
