import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173" }, // port par défaut de Vite
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Route de test
app.get("/", (req, res) => {
  res.json({ message: "Serveur MMIvers en ligne !" });
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

// Connexion Socket.IO
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté : ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Utilisateur déconnecté : ${socket.id}`);
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
