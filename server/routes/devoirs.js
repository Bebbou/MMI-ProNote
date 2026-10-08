import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { sendPushToGroup } from "../utils/push.js";

const router = Router();

// Issue #51 : un devoir est soit un devoir classique, soit une évaluation
const TYPES = ["Devoir", "Evaluation"];

// GET /devoirs — liste les devoirs du groupe de l'utilisateur connecté, avec
// pour chacun si LUI (pas le groupe) l'a marqué comme rendu
router.get("/", requireAuth, async (req, res) => {
  const devoirs = await prisma.devoir.findMany({
    where: { groupeId: req.user.groupeId },
    orderBy: { dateLimite: "asc" },
    include: {
      auteur: { select: { nom: true } },
      rendus: { where: { userId: req.user.id }, select: { id: true } },
      _count: { select: { commentaires: true } },
    },
  });
  res.json(devoirs.map(({ rendus, ...d }) => ({ ...d, rendu: rendus.length > 0 })));
});

// POST /devoirs/:id/rendu — bascule "j'ai rendu ce devoir" pour l'utilisateur connecté
// (état personnel : ne touche pas aux autres membres du groupe)
router.post("/:id/rendu", requireAuth, async (req, res) => {
  const devoirId = Number(req.params.id);
  const devoir = await prisma.devoir.findUnique({ where: { id: devoirId } });
  if (!devoir) return res.status(404).json({ error: "Devoir introuvable." });
  if (devoir.groupeId !== req.user.groupeId) return res.status(403).json({ error: "Accès refusé." });

  const existant = await prisma.devoirRendu.findUnique({
    where: { devoirId_userId: { devoirId, userId: req.user.id } },
  });

  if (existant) {
    await prisma.devoirRendu.delete({ where: { id: existant.id } });
    return res.json({ rendu: false });
  }

  await prisma.devoirRendu.create({ data: { devoirId, userId: req.user.id } });
  res.json({ rendu: true });
});

// POST /devoirs — crée un devoir (admin ou délégué seulement)
router.post("/", requireAuth, requireRole("admin", "delegue"), async (req, res) => {
  const { titre, matiere, description, dateLimite, type = "Devoir" } = req.body;
  if (!titre || !matiere || !dateLimite) {
    return res.status(400).json({ error: "Titre, matière et date limite sont requis." });
  }
  if (!TYPES.includes(type)) return res.status(400).json({ error: "Type invalide." });

  const devoir = await prisma.devoir.create({
    data: {
      titre,
      matiere,
      description,
      type,
      dateLimite: new Date(dateLimite),
      groupeId: req.user.groupeId,
      auteurId: req.user.id,
    },
    include: { auteur: { select: { nom: true } } },
  });

  // Temps réel Socket.IO
  req.io.to(`groupe-${req.user.groupeId}`).emit("nouveauDevoir", devoir);

  // Notification push aux membres du groupe
  const date = new Date(devoir.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  sendPushToGroup(req.user.groupeId, req.user.id, {
    title: `${devoir.type === "Evaluation" ? "Nouvelle évaluation" : "Nouveau devoir"} · ${devoir.matiere}`,
    body: `${devoir.titre} — à rendre pour le ${date}`,
    url: "/devoirs",
    tag: `devoir-${devoir.id}`,
  });

  res.status(201).json(devoir);
});

// PATCH /devoirs/:id — modifie un devoir (admin ou délégué du groupe, pas seulement
// son auteur — même règle que la suppression, pour rester cohérent)
router.patch("/:id", requireAuth, requireRole("admin", "delegue"), async (req, res) => {
  const id = Number(req.params.id);
  const devoir = await prisma.devoir.findUnique({ where: { id } });
  if (!devoir) return res.status(404).json({ error: "Devoir introuvable." });
  if (devoir.groupeId !== req.user.groupeId) return res.status(403).json({ error: "Accès refusé." });

  const { titre, matiere, description, dateLimite, type = devoir.type } = req.body;
  if (!titre || !matiere || !dateLimite) {
    return res.status(400).json({ error: "Titre, matière et date limite sont requis." });
  }
  if (!TYPES.includes(type)) return res.status(400).json({ error: "Type invalide." });

  const updated = await prisma.devoir.update({
    where: { id },
    data: { titre, matiere, description, type, dateLimite: new Date(dateLimite) },
    include: { auteur: { select: { nom: true } }, _count: { select: { commentaires: true } } },
  });

  req.io.to(`groupe-${req.user.groupeId}`).emit("devoirModifie", updated);

  res.json(updated);
});

// DELETE /devoirs/:id — supprime un devoir (admin ou délégué seulement)
router.delete("/:id", requireAuth, requireRole("admin", "delegue"), async (req, res) => {
  const devoir = await prisma.devoir.findUnique({ where: { id: Number(req.params.id) } });
  if (!devoir) return res.status(404).json({ error: "Devoir introuvable." });
  if (devoir.groupeId !== req.user.groupeId) return res.status(403).json({ error: "Accès refusé." });

  await prisma.devoir.delete({ where: { id: Number(req.params.id) } });

  req.io.to(`groupe-${req.user.groupeId}`).emit("devoirSupprime", { id: Number(req.params.id) });

  res.json({ message: "Devoir supprimé." });
});

// Charge un devoir et vérifie qu'il appartient au groupe de l'utilisateur ; répond
// directement (404/403) et renvoie null sinon
async function devoirDuGroupe(req, res) {
  const devoir = await prisma.devoir.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, groupeId: true },
  });
  if (!devoir) {
    res.status(404).json({ error: "Devoir introuvable." });
    return null;
  }
  if (devoir.groupeId !== req.user.groupeId) {
    res.status(403).json({ error: "Accès refusé." });
    return null;
  }
  return devoir;
}

// GET /devoirs/:id/commentaires — commentaires d'un devoir de son groupe
router.get("/:id/commentaires", requireAuth, async (req, res) => {
  const devoir = await devoirDuGroupe(req, res);
  if (!devoir) return;

  const commentaires = await prisma.commentaireDevoir.findMany({
    where: { devoirId: devoir.id },
    include: { auteur: { select: { id: true, nom: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(commentaires);
});

// POST /devoirs/:id/commentaires — tout membre du groupe peut commenter
router.post("/:id/commentaires", requireAuth, async (req, res) => {
  const content = req.body.content?.trim();
  if (!content) return res.status(400).json({ error: "Commentaire vide." });
  if (content.length > 1000) return res.status(400).json({ error: "Commentaire trop long (1000 max)." });

  const devoir = await devoirDuGroupe(req, res);
  if (!devoir) return;

  const commentaire = await prisma.commentaireDevoir.create({
    data: { content, auteurId: req.user.id, devoirId: devoir.id },
    include: { auteur: { select: { id: true, nom: true, role: true } } },
  });
  res.status(201).json(commentaire);
});

// DELETE /devoirs/commentaires/:id — l'auteur, ou un admin/délégué du groupe (modération)
router.delete("/commentaires/:id", requireAuth, async (req, res) => {
  const c = await prisma.commentaireDevoir.findUnique({
    where: { id: Number(req.params.id) },
    include: { devoir: { select: { groupeId: true } } },
  });
  if (!c) return res.status(404).json({ error: "Commentaire introuvable." });
  if (c.devoir.groupeId !== req.user.groupeId) return res.status(403).json({ error: "Accès refusé." });

  const moderateur = ["admin", "delegue"].includes(req.user.role);
  if (!moderateur && c.auteurId !== req.user.id) return res.status(403).json({ error: "Non autorisé." });

  await prisma.commentaireDevoir.delete({ where: { id: c.id } });
  res.json({ message: "Commentaire supprimé." });
});

export default router;
