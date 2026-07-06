import jwt from "jsonwebtoken";
import prisma from "../db.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token manquant." });

  const token = header.split(" ")[1]; // format : "Bearer <token>"

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }

  // Recharge le rôle et le groupe depuis la base : un changement de rôle
  // (ou une suppression de compte) prend effet immédiatement, sans attendre
  // l'expiration du token (7 jours)
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, role: true, groupeId: true, valide: true },
    });

    if (!user || !user.valide) {
      return res.status(401).json({ error: "Compte introuvable ou désactivé." });
    }

    req.user = { id: user.id, role: user.role, groupeId: user.groupeId };
    next();
  } catch {
    res.status(500).json({ error: "Erreur serveur." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Accès refusé." });
    }
    next();
  };
}
