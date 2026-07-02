import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

// GET /chat/channels — liste tous les canaux accessibles
router.get("/channels", async (req, res) => {
  const channels = await prisma.channel.findMany({ orderBy: { createdAt: "asc" } });
  res.json(channels);
});

// POST /chat/channels — créer un canal (admin seulement)
router.post("/channels", requireRole("admin"), async (req, res) => {
  const { nom, description } = req.body;
  if (!nom) return res.status(400).json({ error: "Nom requis." });
  const existing = await prisma.channel.findUnique({ where: { nom } });
  if (existing) return res.status(400).json({ error: "Ce canal existe déjà." });
  const channel = await prisma.channel.create({ data: { nom, description, type: "custom" } });
  req.io.emit("nouveauChannel", channel);
  res.status(201).json(channel);
});

// DELETE /chat/channels/:id — supprimer un canal custom (admin seulement)
router.delete("/channels/:id", requireRole("admin"), async (req, res) => {
  const channel = await prisma.channel.findUnique({ where: { id: Number(req.params.id) } });
  if (!channel) return res.status(404).json({ error: "Canal introuvable." });
  if (channel.type !== "custom") return res.status(403).json({ error: "Impossible de supprimer un canal système." });
  await prisma.channel.delete({ where: { id: channel.id } });
  req.io.emit("channelSupprime", { id: channel.id });
  res.json({ message: "Canal supprimé." });
});

// GET /chat/channels/:id/messages — 50 derniers messages d'un canal
router.get("/channels/:id/messages", async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { channelId: Number(req.params.id) },
    include: { auteur: { select: { id: true, nom: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  res.json(messages);
});

// DELETE /chat/messages/:id — supprimer un message (admin seulement)
router.delete("/messages/:id", requireRole("admin"), async (req, res) => {
  const message = await prisma.message.findUnique({ where: { id: Number(req.params.id) } });
  if (!message) return res.status(404).json({ error: "Message introuvable." });
  await prisma.message.delete({ where: { id: message.id } });
  req.io.to(`channel-${message.channelId}`).emit("messageSupprime", { id: message.id, channelId: message.channelId });
  res.json({ message: "Message supprimé." });
});

export default router;
