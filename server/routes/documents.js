import { Router } from "express";
import multer from "multer";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { sendPushToPromo } from "../utils/push.js";
import { peutVoirDocument, peutGererDocument } from "../utils/documentAccess.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Seuls les fichiers PDF sont acceptés."));
  },
});

// Types de séance reconnus (issue #37). "Autre" reste la valeur par défaut pour
// les anciens documents importés avant l'ajout de ce champ.
const TYPES = ["CM", "TD", "TP", "Projet", "Autre"];

const docSelect = {
  id: true,
  titre: true,
  description: true,
  matiere: true,
  prof: true,
  type: true,
  promo: true,
  fileName: true,
  fileSize: true,
  createdAt: true,
  auteur: { select: { id: true, nom: true } },
  _count: { select: { commentaires: true } },
};

// Issues #49 et #25 : un cours n'est visible que par la promo à laquelle il est destiné
// (règles complètes dans utils/documentAccess.js). Les admins et professeurs publient.
const peutVoir = peutVoirDocument;

// Promo choisie pour un document : celle de l'admin par défaut, ou une promo existante
async function resoudrePromo(user, brute) {
  const promo = brute || user.promo;
  const existe = await prisma.groupe.findFirst({ where: { promo }, select: { id: true } });
  return existe ? promo : null;
}

// Charge un document visible par l'utilisateur ; répond 404 sinon (on ne révèle pas
// l'existence d'un cours d'une autre promo). Renvoie null si la réponse est déjà envoyée.
async function chargerDoc(req, res, args = {}) {
  const doc = await prisma.document.findUnique({ where: { id: Number(req.params.id) }, ...args });
  if (!doc || !peutVoir(req.user, doc)) {
    res.status(404).json({ error: "Document introuvable." });
    return null;
  }
  return doc;
}

// GET /documents
router.get("/", async (req, res) => {
  const docs = await prisma.document.findMany({
    where:
      req.user.role === "admin"
        ? {}
        : {
            OR: [
              { promo: req.user.promo },
              ...(req.user.role === "professeur" ? [{ auteurId: req.user.id }] : []),
            ],
          },
    select: docSelect,
    orderBy: { createdAt: "desc" },
  });
  res.json(docs);
});

// GET /documents/:id/download
router.get("/:id/download", async (req, res) => {
  const doc = await chargerDoc(req, res);
  if (!doc) return;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
  res.send(doc.fileData);
});

// POST /documents (admin ou professeur)
router.post("/", requireRole("admin", "professeur"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fichier PDF requis." });
  const { titre, description, matiere, prof, type } = req.body;
  if (!titre || !matiere) return res.status(400).json({ error: "Titre et matière requis." });
  if (type && !TYPES.includes(type)) return res.status(400).json({ error: "Type invalide." });
  const promo = await resoudrePromo(req.user, req.body.promo);
  if (!promo) return res.status(400).json({ error: "Promo inconnue." });
  const doc = await prisma.document.create({
    data: {
      titre,
      description: description || null,
      matiere,
      prof: prof?.trim() || null,
      type: type || "Autre",
      promo,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileData: req.file.buffer,
      auteurId: req.user.id,
    },
    select: docSelect,
  });
  sendPushToPromo(doc.promo, req.user.id, {
    title: `Nouveau cours · ${doc.matiere}`,
    body: `${doc.titre}${doc.description ? ` — ${doc.description}` : ""}`,
    url: "/documents",
    tag: `document-${doc.id}`,
  });

  res.status(201).json(doc);
});

// PATCH /documents/:id (admin, ou professeur pour ses propres cours) — modifie les tags (ressource/prof/type) et les infos
// d'un document déjà publié, sans avoir à ré-uploader le fichier (issue #37)
router.patch("/:id", requireRole("admin", "professeur"), async (req, res) => {
  const doc = await chargerDoc(req, res);
  if (!doc) return;
  if (!peutGererDocument(req.user, doc))
    return res.status(403).json({ error: "Tu ne peux modifier que tes propres cours." });

  const { titre, description, matiere, prof, type } = req.body;
  if (type && !TYPES.includes(type)) return res.status(400).json({ error: "Type invalide." });

  const data = {};
  if (titre) data.titre = titre;
  if (description !== undefined) data.description = description || null;
  if (matiere) data.matiere = matiere;
  if (prof !== undefined) data.prof = prof?.trim() || null;
  if (type) data.type = type;
  if (req.body.promo) {
    const promo = await resoudrePromo(req.user, req.body.promo);
    if (!promo) return res.status(400).json({ error: "Promo inconnue." });
    data.promo = promo;
  }

  const updated = await prisma.document.update({ where: { id: doc.id }, data, select: docSelect });
  res.json(updated);
});

// DELETE /documents/:id (admin, ou professeur pour ses propres cours)
router.delete("/:id", requireRole("admin", "professeur"), async (req, res) => {
  const doc = await chargerDoc(req, res);
  if (!doc) return;
  if (!peutGererDocument(req.user, doc))
    return res.status(403).json({ error: "Tu ne peux supprimer que tes propres cours." });
  await prisma.document.delete({ where: { id: doc.id } });
  res.json({ message: "Document supprimé." });
});

// GET /documents/:id/commentaires
router.get("/:id/commentaires", async (req, res) => {
  const doc = await chargerDoc(req, res, { select: { id: true, promo: true, auteurId: true } });
  if (!doc) return;
  const commentaires = await prisma.commentaireDoc.findMany({
    where: { documentId: doc.id },
    include: { auteur: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(commentaires);
});

// POST /documents/:id/commentaires
router.post("/:id/commentaires", async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Commentaire vide." });
  const doc = await chargerDoc(req, res, { select: { id: true, promo: true, auteurId: true } });
  if (!doc) return;
  const commentaire = await prisma.commentaireDoc.create({
    data: { content: content.trim(), auteurId: req.user.id, documentId: doc.id },
    include: { auteur: { select: { id: true, nom: true } } },
  });
  res.status(201).json(commentaire);
});

// DELETE /documents/commentaires/:id (admin ou auteur)
router.delete("/commentaires/:id", async (req, res) => {
  const c = await prisma.commentaireDoc.findUnique({
    where: { id: Number(req.params.id) },
    include: { document: { select: { promo: true, auteurId: true } } },
  });
  if (!c || !peutVoir(req.user, c.document))
    return res.status(404).json({ error: "Commentaire introuvable." });
  if (req.user.role !== "admin" && c.auteurId !== req.user.id)
    return res.status(403).json({ error: "Non autorisé." });
  await prisma.commentaireDoc.delete({ where: { id: c.id } });
  res.json({ message: "Commentaire supprimé." });
});

export default router;
