import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import jwt from "jsonwebtoken";
import prisma from "./db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import devoirsRoutes from "./routes/devoirs.js";
import notesRoutes from "./routes/notes.js";
import edtRoutes from "./routes/edt.js";
import profilRoutes from "./routes/profil.js";
import notificationsRoutes from "./routes/notifications.js";
import chatRoutes from "./routes/chat.js";
import documentsRoutes from "./routes/documents.js";
import { sendPushToUsers } from "./utils/push.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: true },
});

app.use(cors({ origin: true }));
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "Serveur Pronote-MMI en ligne !" });
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/devoirs", devoirsRoutes);
app.use("/notes", notesRoutes);
app.use("/edt", edtRoutes);
app.use("/profil", profilRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/chat", chatRoutes);
app.use("/documents", documentsRoutes);

// Socket.IO — auth + chat temps réel
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Non authentifié"));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Token invalide"));
  }
});

io.on("connection", (socket) => {
  socket.on("rejoindreGroupe", (groupeId) => {
    socket.join(`groupe-${groupeId}`);
  });

  socket.on("rejoindreChannel", (channelId) => {
    socket.join(`channel-${channelId}`);
  });

  socket.on("quitterChannel", (channelId) => {
    socket.leave(`channel-${channelId}`);
  });

  socket.on("envoyerMessage", async ({ channelId, content, replyToId }) => {
    if (!content?.trim() || !channelId) return;
    try {
      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          channelId,
          auteurId: socket.user.id,
          ...(replyToId ? { replyToId } : {}),
        },
        include: {
          auteur: { select: { id: true, nom: true } },
          reactions: { include: { user: { select: { id: true, nom: true } } } },
          replyTo: { select: { id: true, content: true, auteur: { select: { id: true, nom: true } } } },
        },
      });
      io.to(`channel-${channelId}`).emit("nouveauMessage", message);

      // Notif push si canal non-général
      const channel = await prisma.channel.findUnique({ where: { id: channelId }, select: { type: true, nom: true } });
      if (channel && channel.type !== "general") {
        const usersInRoom = await new Promise(resolve => {
          io.in(`channel-${channelId}`).fetchSockets().then(sockets => {
            resolve(sockets.map(s => s.user?.id).filter(Boolean));
          });
        });
        const membres = await prisma.user.findMany({
          where: { valide: true, id: { not: socket.user.id } },
          select: { id: true },
        });
        const toNotify = membres.map(u => u.id).filter(id => !usersInRoom.includes(id));
        sendPushToUsers(toNotify, {
          title: `#${channel.nom} — ${message.auteur.nom}`,
          body: message.content.slice(0, 100),
          url: "/chat",
          tag: `chat-${channelId}`,
        });
      }
    } catch {}
  });

  socket.on("startTyping", ({ channelId, nom }) => {
    socket.to(`channel-${channelId}`).emit("userTyping", {
      userId: socket.user.id,
      nom,
      channelId,
    });
  });

  socket.on("stopTyping", ({ channelId }) => {
    socket.to(`channel-${channelId}`).emit("userStopTyping", {
      userId: socket.user.id,
      channelId,
    });
  });

  socket.on("disconnect", () => {});
});

async function seedChannels() {
  const defauts = [
    { nom: "général", description: "Canal ouvert à tous", type: "general" },
    { nom: "TPA1", description: "Canal du groupe TPA1", type: "groupe" },
    { nom: "TPA2", description: "Canal du groupe TPA2", type: "groupe" },
    { nom: "TPB1", description: "Canal du groupe TPB1", type: "groupe" },
    { nom: "TPB2", description: "Canal du groupe TPB2", type: "groupe" },
  ];
  for (const c of defauts) {
    await prisma.channel.upsert({ where: { nom: c.nom }, update: {}, create: c });
  }
}

process.on("uncaughtException", (e) => console.error("uncaughtException:", e));
process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  try {
    await seedChannels();
  } catch (e) {
    console.warn("seedChannels ignoré :", e.message);
  }
});
