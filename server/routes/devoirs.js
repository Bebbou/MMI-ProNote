import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { notifierSansBloquer, ciblesDevoir } from "../utils/notifier.js";
import {
  peutCiblerLibrement,
  peutGererDevoir,
  idsOptionsDe,
  filtreDevoirsVisibles,
  devoirEstVisible,
  chargerDevoirVisible,
  roomsDevoir,
} from "../utils/devoirAccess.js";

const router = Router();

// Issue #51 : un devoir est soit un devoir classique, soit une évaluation
const TYPES = ["Devoir", "Evaluation"];

const includeDevoir = {
  auteur: { select: { id: true, nom: true, role: true } },
  option: { select: { id: true, nom: true, promo: true } },
  groupe: { select: { id: true, nom: true, promo: true } },
  _count: { select: { commentaires: true } },
};

// Résout l'audience demandée (`cible`) en { optionId, groupeId, promoCible }, ou { erreur }.
//   ""            -> mon groupe
//   "option:5"    -> les membres de l'option 5 (une option de MA promo)
//   "promo:MMI2"  -> toute la promo         (admin et professeur seulement)
//   "groupe:12"   -> un autre groupe        (admin et professeur seulement)
async function resoudreCible(user, cible) {
  const defaut = { optionId: null, groupeId: user.groupeId, promoCible: null };
  if (!cible) return defaut;

  const [type, valeur] = String(cible).split(":");
  if (type === "option") {
    const option = await prisma.option.findUnique({ where: { id: Number(valeur) } });
    if (!option || option.promo !== user.promo) return { erreur: "Option invalide." };
    return { ...defaut, optionId: option.id };
  }

  if (!peutCiblerLibrement(user)) return { erreur: "Tu ne peux cibler que ton groupe ou une option." };

  if (type === "promo") {
    const existe = await prisma.groupe.findFirst({ where: { promo: valeur }, select: { id: true } });
    if (!existe) return { erreur: "Promo inconnue." };
    return { ...defaut, promoCible: valeur };
  }
  if (type === "groupe") {
    const groupe = await prisma.groupe.findUnique({ where: { id: Number(valeur) } });
    if (!groupe) return { erreur: "Groupe inconnu." };
    return { ...defaut, groupeId: groupe.id };
  }
  return { erreur: "Cible invalide." };
}

// GET /devoirs — liste les devoirs visibles par l'utilisateur (son groupe + ses options),
// avec pour chacun si LUI (pas le groupe) l'a marqué comme rendu
router.get("/", requireAuth, async (req, res) => {
  const optionIds = await idsOptionsDe(req.user.id);
  const devoirs = await prisma.devoir.findMany({
    where: filtreDevoirsVisibles(req.user, optionIds),
    orderBy: { dateLimite: "asc" },
    include: {
      ...includeDevoir,
      rendus: { where: { userId: req.user.id }, select: { id: true } },
    },
  });
  res.json(devoirs.map(({ rendus, ...d }) => ({ ...d, rendu: rendus.length > 0 })));
});

// POST /devoirs/:id/rendu — bascule "j'ai rendu ce devoir" pour l'utilisateur connecté
// (état personnel : ne touche pas aux autres membres du groupe)
router.post("/:id/rendu", requireAuth, async (req, res) => {
  const devoir = await chargerDevoirVisible(req, res, Number(req.params.id));
  if (!devoir) return;
  const devoirId = devoir.id;

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

// POST /devoirs — crée un devoir (admin, délégué ou professeur). `cible` optionnel :
// groupe (défaut), option, ou — pour un admin/professeur — une promo ou un autre groupe.
router.post("/", requireAuth, requireRole("admin", "delegue", "professeur"), async (req, res) => {
  const { titre, matiere, description, dateLimite, type = "Devoir" } = req.body;
  if (!titre || !matiere || !dateLimite) {
    return res.status(400).json({ error: "Titre, matière et date limite sont requis." });
  }
  if (!TYPES.includes(type)) return res.status(400).json({ error: "Type invalide." });

  const { optionId, groupeId, promoCible, erreur } = await resoudreCible(req.user, req.body.cible);
  if (erreur) return res.status(400).json({ error: erreur });

  const devoir = await prisma.devoir.create({
    data: {
      titre,
      matiere,
      description,
      type,
      optionId,
      promoCible,
      rappelEnvoye: new Date(dateLimite) - Date.now() <= 24 * 60 * 60 * 1000,
      dateLimite: new Date(dateLimite),
      groupeId,
      auteurId: req.user.id,
    },
    include: includeDevoir,
  });

  // Temps réel Socket.IO
  req.io.to(roomsDevoir(devoir)).emit("nouveauDevoir", devoir);

  // Notification push : membres de l'option, ou groupe entier
  const date = new Date(devoir.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const payload = {
    title: `${devoir.type === "Evaluation" ? "Nouvelle évaluation" : "Nouveau devoir"} · ${devoir.matiere}`,
    body: `${devoir.titre} — à rendre pour le ${date}`,
    url: "/devoirs",
    tag: `devoir-${devoir.id}`,
  };
  notifierSansBloquer({
    where: ciblesDevoir(devoir),
    categorie: "devoir",
    payload,
    exclureUserId: req.user.id,
  });

  res.status(201).json(devoir);
});

// PATCH /devoirs/:id — modifie un devoir (admin ou délégué qui le voit, pas seulement
// son auteur — même règle que la suppression, pour rester cohérent)
router.patch("/:id", requireAuth, requireRole("admin", "delegue", "professeur"), async (req, res) => {
  const devoir = await chargerDevoirVisible(req, res, Number(req.params.id), {
    type: true,
    dateLimite: true,
  });
  if (!devoir) return;
  if (!peutGererDevoir(req.user, devoir)) {
    return res.status(403).json({ error: "Tu ne peux pas modifier ce devoir." });
  }

  const { titre, matiere, description, dateLimite, type = devoir.type } = req.body;
  if (!titre || !matiere || !dateLimite) {
    return res.status(400).json({ error: "Titre, matière et date limite sont requis." });
  }
  if (!TYPES.includes(type)) return res.status(400).json({ error: "Type invalide." });

  // `cible` absente = on ne touche pas à l'audience
  let audience = { optionId: devoir.optionId, groupeId: devoir.groupeId, promoCible: devoir.promoCible };
  if ("cible" in req.body) {
    const r = await resoudreCible(req.user, req.body.cible);
    if (r.erreur) return res.status(400).json({ error: r.erreur });
    audience = r;
  }

  const updated = await prisma.devoir.update({
    where: { id: devoir.id },
    data: {
      titre,
      matiere,
      description,
      type,
      ...audience,
      dateLimite: new Date(dateLimite),
      // Échéance déplacée : le rappel redevient possible (sauf si elle est déjà sous 24h)
      ...(new Date(dateLimite).getTime() !== devoir.dateLimite.getTime()
        ? { rappelEnvoye: new Date(dateLimite) - Date.now() <= 24 * 60 * 60 * 1000 }
        : {}),
    },
    include: includeDevoir,
  });

  const memeAudience = roomsDevoir(devoir).join() === roomsDevoir(updated).join();
  if (memeAudience) {
    req.io.to(roomsDevoir(updated)).emit("devoirModifie", updated);
  } else {
    // L'audience a changé : l'ancienne perd le devoir, la nouvelle le découvre
    req.io.to(roomsDevoir(devoir)).emit("devoirSupprime", { id: updated.id });
    req.io.to(roomsDevoir(updated)).emit("nouveauDevoir", updated);
  }

  res.json(updated);
});

// DELETE /devoirs/:id — supprime un devoir (admin ou délégué seulement)
router.delete("/:id", requireAuth, requireRole("admin", "delegue", "professeur"), async (req, res) => {
  const devoir = await chargerDevoirVisible(req, res, Number(req.params.id));
  if (!devoir) return;
  if (!peutGererDevoir(req.user, devoir)) {
    return res.status(403).json({ error: "Tu ne peux pas supprimer ce devoir." });
  }

  await prisma.devoir.delete({ where: { id: devoir.id } });

  req.io.to(roomsDevoir(devoir)).emit("devoirSupprime", { id: devoir.id });

  res.json({ message: "Devoir supprimé." });
});

// GET /devoirs/:id/commentaires — commentaires d'un devoir visible par l'utilisateur
router.get("/:id/commentaires", requireAuth, async (req, res) => {
  const devoir = await chargerDevoirVisible(req, res, Number(req.params.id));
  if (!devoir) return;

  const commentaires = await prisma.commentaireDevoir.findMany({
    where: { devoirId: devoir.id },
    include: { auteur: { select: { id: true, nom: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(commentaires);
});

// POST /devoirs/:id/commentaires — tout utilisateur qui voit le devoir peut commenter
router.post("/:id/commentaires", requireAuth, async (req, res) => {
  const content = req.body.content?.trim();
  if (!content) return res.status(400).json({ error: "Commentaire vide." });
  if (content.length > 1000) return res.status(400).json({ error: "Commentaire trop long (1000 max)." });

  const devoir = await chargerDevoirVisible(req, res, Number(req.params.id));
  if (!devoir) return;

  const commentaire = await prisma.commentaireDevoir.create({
    data: { content, auteurId: req.user.id, devoirId: devoir.id },
    include: { auteur: { select: { id: true, nom: true, role: true } } },
  });
  res.status(201).json(commentaire);
});

// DELETE /devoirs/commentaires/:id — l'auteur, ou un admin/délégué (modération)
router.delete("/commentaires/:id", requireAuth, async (req, res) => {
  const c = await prisma.commentaireDevoir.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      devoir: {
        select: {
          groupeId: true,
          optionId: true,
          promoCible: true,
          auteurId: true,
          option: { select: { promo: true } },
        },
      },
    },
  });
  if (!c) return res.status(404).json({ error: "Commentaire introuvable." });

  const optionIds = c.devoir.optionId == null ? [] : await idsOptionsDe(req.user.id);
  if (!devoirEstVisible(req.user, optionIds, c.devoir))
    return res.status(403).json({ error: "Accès refusé." });

  // Modération : admin/délégué, ou le professeur auteur du devoir commenté
  const moderateur =
    ["admin", "delegue"].includes(req.user.role) ||
    (req.user.role === "professeur" && c.devoir.auteurId === req.user.id);
  if (!moderateur && c.auteurId !== req.user.id) return res.status(403).json({ error: "Non autorisé." });

  await prisma.commentaireDevoir.delete({ where: { id: c.id } });
  res.json({ message: "Commentaire supprimé." });
});

export default router;
