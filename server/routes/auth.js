import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";
import prisma from "../db.js";

// Clé factice en dev local : l'envoi échouera mais le serveur démarre
const resend = new Resend(process.env.RESEND_API_KEY || "re_dev_placeholder");

const router = Router();

// Anti brute-force : 10 tentatives max par IP toutes les 15 minutes
// sur les routes sensibles (login, register, mots de passe)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessaie dans 15 minutes." },
});

// POST /auth/register — inscription
router.post("/register", authLimiter, async (req, res) => {
  const { nom, email, password, groupeNom } = req.body;

  if (!nom || !email || !password || !groupeNom) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit faire au moins 6 caractères." });
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
router.post("/login", authLimiter, async (req, res) => {
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

// POST /auth/forgot-password — envoie un email de réinitialisation
router.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requis." });

  const user = await prisma.user.findUnique({ where: { email } });

  // On répond toujours OK pour ne pas révéler si l'email existe
  if (!user) return res.json({ message: "Si cet email existe, un lien a été envoyé." });

  // Invalide les anciens tokens
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.passwordReset.create({ data: { token, expiresAt, userId: user.id } });

  const resetUrl = `${process.env.CLIENT_ORIGIN}/reset-password?token=${token}`;

  await resend.emails.send({
    from: "Pronote-MMI <onboarding@resend.dev>",
    to: email,
    subject: "Réinitialisation de ton mot de passe",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h2 style="color: #fe7db6;">Pronote-MMI</h2>
        <p>Bonjour ${user.nom},</p>
        <p>Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton ci-dessous (lien valable 1h) :</p>
        <a href="${resetUrl}" style="display:inline-block;margin:1rem 0;padding:0.75rem 1.5rem;background:#fe7db6;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color:#94a3b8;font-size:0.85rem;">Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
      </div>
    `,
  });

  res.json({ message: "Si cet email existe, un lien a été envoyé." });
});

// POST /auth/reset-password — réinitialise le mot de passe avec le token
router.post("/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Champs manquants." });
  if (password.length < 6) return res.status(400).json({ error: "Le mot de passe doit faire au moins 6 caractères." });

  const reset = await prisma.passwordReset.findUnique({ where: { token } });

  if (!reset || reset.used || reset.expiresAt < new Date()) {
    return res.status(400).json({ error: "Lien invalide ou expiré." });
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: reset.userId }, data: { password: hash } });
  await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });

  res.json({ message: "Mot de passe réinitialisé avec succès." });
});

export default router;
