import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

const PAGE_SIZE = 50;

const msgInclude = {
  auteur: { select: { id: true, nom: true } },
  reactions: { include: { user: { select: { id: true, nom: true } } } },
  replyTo: {
    select: {
      id: true,
      content: true,
      auteur: { select: { id: true, nom: true } },
    },
  },
};

// GET /chat/channels
router.get("/channels", async (req, res) => {
  if (req.user.role === "admin") {
    const channels = await prisma.channel.findMany({ orderBy: { createdAt: "asc" } });
    return res.json(channels);
  }
  const userGroupe = await prisma.groupe.findUnique({
    where: { id: req.user.groupeId },
    select: { nom: true },
  });
  // TA1/TA2 → TDA, TB1/TB2 → TDB
  const tdNom = "TD" + userGroupe.nom[1];
  const channels = await prisma.channel.findMany({
    where: {
      OR: [
        { type: "general" },
        { type: "custom" },
        { type: "groupe", nom: userGroupe.nom },
        { type: "td", nom: tdNom },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  res.json(channels);
});

// POST /chat/channels (admin)
router.post("/channels", requireRole("admin"), async (req, res) => {
  const { nom, description } = req.body;
  if (!nom) return res.status(400).json({ error: "Nom requis." });
  const existing = await prisma.channel.findUnique({ where: { nom } });
  if (existing) return res.status(400).json({ error: "Ce canal existe déjà." });
  const channel = await prisma.channel.create({ data: { nom, description, type: "custom" } });
  req.io.emit("nouveauChannel", channel);
  res.status(201).json(channel);
});

// DELETE /chat/channels/:id (admin)
router.delete("/channels/:id", requireRole("admin"), async (req, res) => {
  const channel = await prisma.channel.findUnique({ where: { id: Number(req.params.id) } });
  if (!channel) return res.status(404).json({ error: "Canal introuvable." });
  if (channel.type !== "custom") return res.status(403).json({ error: "Impossible de supprimer un canal système." });
  await prisma.channel.delete({ where: { id: channel.id } });
  req.io.emit("channelSupprime", { id: channel.id });
  res.json({ message: "Canal supprimé." });
});

// GET /chat/channels/:id/messages?before=:id
router.get("/channels/:id/messages", async (req, res) => {
  const channelId = Number(req.params.id);
  const before = req.query.before ? Number(req.query.before) : undefined;

  const messages = await prisma.message.findMany({
    where: { channelId, ...(before ? { id: { lt: before } } : {}) },
    include: msgInclude,
    orderBy: { id: "desc" },
    take: PAGE_SIZE + 1,
  });

  const hasMore = messages.length > PAGE_SIZE;
  res.json({ messages: messages.slice(0, PAGE_SIZE).reverse(), hasMore });
});

// DELETE /chat/messages/:id (admin)
router.delete("/messages/:id", requireRole("admin"), async (req, res) => {
  const message = await prisma.message.findUnique({ where: { id: Number(req.params.id) } });
  if (!message) return res.status(404).json({ error: "Message introuvable." });
  await prisma.message.delete({ where: { id: message.id } });
  req.io.to(`channel-${message.channelId}`).emit("messageSupprime", { id: message.id });
  res.json({ message: "Message supprimé." });
});

// PATCH /chat/messages/:id (auteur ou admin)
router.patch("/messages/:id", async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Contenu requis." });
  const message = await prisma.message.findUnique({ where: { id: Number(req.params.id) } });
  if (!message) return res.status(404).json({ error: "Message introuvable." });
  // eslint-disable-next-line eqeqeq
  if (message.auteurId != req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Interdit." });
  }
  const updated = await prisma.message.update({
    where: { id: message.id },
    data: { content: content.trim(), editedAt: new Date() },
  });
  req.io.to(`channel-${message.channelId}`).emit("messageModifie", {
    id: updated.id,
    content: updated.content,
    editedAt: updated.editedAt,
    channelId: updated.channelId,
  });
  res.json(updated);
});

// POST /chat/messages/:id/reactions (toggle)
router.post("/messages/:id/reactions", async (req, res) => {
  const { emoji } = req.body;
  const messageId = Number(req.params.id);
  const userId = req.user.id;

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return res.status(404).json({ error: "Message introuvable." });

  const existing = await prisma.reaction.findUnique({
    where: { userId_messageId_emoji: { userId, messageId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { emoji, userId, messageId } });
  }

  const reactions = await prisma.reaction.findMany({
    where: { messageId },
    include: { user: { select: { id: true, nom: true } } },
  });

  req.io.to(`channel-${message.channelId}`).emit("reactionMaj", { messageId, reactions });
  res.json({ reactions });
});

export default router;
