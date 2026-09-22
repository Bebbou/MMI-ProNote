import { Router } from "express";
import multer from "multer";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { sendPushToAll } from "../utils/push.js";

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
  fileName: true,
  fileSize: true,
  createdAt: true,
  auteur: { select: { id: true, nom: true } },
  _count: { select: { commentaires: true } },
};

// GET /documents
router.get("/", async (req, res) => {
  const docs = await prisma.document.findMany({
    select: docSelect,
    orderBy: { createdAt: "desc" },
  });
  res.json(docs);
});

// GET /documents/:id/download
router.get("/:id/download", async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: Number(req.params.id) } });
  if (!doc) return res.status(404).json({ error: "Document introuvable." });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
  res.send(doc.fileData);
});

// POST /documents (admin)
router.post("/", requireRole("admin"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fichier PDF requis." });
  const { titre, description, matiere, prof, type } = req.body;
  if (!titre || !matiere) return res.status(400).json({ error: "Titre et matière requis." });
  if (type && !TYPES.includes(type)) return res.status(400).json({ error: "Type invalide." });
  const doc = await prisma.document.create({
    data: {
      titre,
      description: description || null,
      matiere,
      prof: prof?.trim() || null,
      type: type || "Autre",
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileData: req.file.buffer,
      auteurId: req.user.id,
    },
    select: docSelect,
  });
  sendPushToAll(req.user.id, {
    title: `Nouveau cours · ${doc.matiere}`,
    body: `${doc.titre}${doc.description ? ` — ${doc.description}` : ""}`,
    url: "/documents",
    tag: `document-${doc.id}`,
  });

  res.status(201).json(doc);
});

// PATCH /documents/:id (admin) — modifie les tags (ressource/prof/type) et les infos
// d'un document déjà publié, sans avoir à ré-uploader le fichier (issue #37)
router.patch("/:id", requireRole("admin"), async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: Number(req.params.id) } });
  if (!doc) return res.status(404).json({ error: "Document introuvable." });

  const { titre, description, matiere, prof, type } = req.body;
  if (type && !TYPES.includes(type)) return res.status(400).json({ error: "Type invalide." });

  const data = {};
  if (titre) data.titre = titre;
  if (description !== undefined) data.description = description || null;
  if (matiere) data.matiere = matiere;
  if (prof !== undefined) data.prof = prof?.trim() || null;
  if (type) data.type = type;

  const updated = await prisma.document.update({ where: { id: doc.id }, data, select: docSelect });
  res.json(updated);
});

// DELETE /documents/:id (admin)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  const doc = await prisma.document.findUnique({ where: { id: Number(req.params.id) } });
  if (!doc) return res.status(404).json({ error: "Document introuvable." });
  await prisma.document.delete({ where: { id: doc.id } });
  res.json({ message: "Document supprimé." });
});

// GET /documents/:id/commentaires
router.get("/:id/commentaires", async (req, res) => {
  const commentaires = await prisma.commentaireDoc.findMany({
    where: { documentId: Number(req.params.id) },
    include: { auteur: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(commentaires);
});

// POST /documents/:id/commentaires
router.post("/:id/commentaires", async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Commentaire vide." });
  const doc = await prisma.document.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true },
  });
  if (!doc) return res.status(404).json({ error: "Document introuvable." });
  const commentaire = await prisma.commentaireDoc.create({
    data: { content: content.trim(), auteurId: req.user.id, documentId: doc.id },
    include: { auteur: { select: { id: true, nom: true } } },
  });
  res.status(201).json(commentaire);
});

// DELETE /documents/commentaires/:id (admin ou auteur)
router.delete("/commentaires/:id", async (req, res) => {
  const c = await prisma.commentaireDoc.findUnique({ where: { id: Number(req.params.id) } });
  if (!c) return res.status(404).json({ error: "Commentaire introuvable." });
  if (req.user.role !== "admin" && c.auteurId !== req.user.id)
    return res.status(403).json({ error: "Non autorisé." });
  await prisma.commentaireDoc.delete({ where: { id: c.id } });
  res.json({ message: "Commentaire supprimé." });
});

export default router;
