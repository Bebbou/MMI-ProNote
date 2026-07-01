import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import devoirsRoutes from "./routes/devoirs.js";
import notesRoutes from "./routes/notes.js";
import edtRoutes from "./routes/edt.js";
import profilRoutes from "./routes/profil.js";
import notificationsRoutes from "./routes/notifications.js";

const app = express();
const httpServer = createServer(app);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const io = new Server(httpServer, {
  cors: { origin: [CLIENT_ORIGIN, "http://localhost:5174"] },
});

app.use(cors({ origin: [CLIENT_ORIGIN, "http://localhost:5174"] }));
app.use(express.json());

// Rend io accessible dans toutes les routes via req.io
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

// Connexion Socket.IO — chaque utilisateur rejoint la room de son groupe
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  socket.on("rejoindreGroupe", (groupeId) => {
    socket.join(`groupe-${groupeId}`);
    console.log(`Socket ${socket.id} a rejoint groupe-${groupeId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Utilisateur déconnecté : ${socket.id}`);
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
