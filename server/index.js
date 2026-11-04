import "dotenv/config";
import "express-async-errors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import prisma from "./db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import devoirsRoutes from "./routes/devoirs.js";
import notesRoutes from "./routes/notes.js";
import edtRoutes from "./routes/edt.js";
import profilRoutes from "./routes/profil.js";
import notificationsRoutes from "./routes/notifications.js";
import documentsRoutes from "./routes/documents.js";
import optionsRoutes from "./routes/options.js";
import { syncTousLesGroupes } from "./services/edtSync.js";
import { envoyerRappels, purgerAnciennesNotifications } from "./services/rappels.js";
import { compteRequetes, lireStats, fluxEvenements, signalerConnexion } from "./utils/stats.js";

const app = express();
const httpServer = createServer(app);

// Origines autorisées : le(s) front(s) en prod (CLIENT_ORIGIN, séparées par des virgules
// si plusieurs, ex. pendant une migration Vercel -> Netlify) + le dev local
const allowedOrigins = [
  ...(process.env.CLIENT_ORIGIN?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? []),
  "http://localhost:5173",
];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins },
});

// Railway est derrière un proxy : nécessaire pour que le rate limiter
// voie la vraie IP du client et pas celle du proxy
app.set("trust proxy", 1);

app.use(compression()); // réponses compressées en gzip : moins de données, plus rapide

// Compteur de requêtes pour le dashboard Pulse : placé avant les routes pour tout voir
app.use(compteRequetes);

// Chiffres agrégés, rien de sensible. Lus depuis un autre site (le dashboard), donc CORS
// ouvert ici. Déclaré AVANT le cors() global ci-dessous, qui ne laisse passer que le front
app.get(
  "/stats",
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  }),
  cors({ origin: "*" }),
  (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(lireStats(io));
  }
);

// Flux en direct (SSE) lu par le dashboard : un battement par requête ou connexion réelle
app.get(
  "/stats/stream",
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  }),
  cors({ origin: "*" }),
  fluxEvenements
);

app.use(cors({ origin: allowedOrigins }));
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
app.use("/documents", documentsRoutes);
app.use("/options", optionsRoutes);

// Gestion d'erreurs globale : toute erreur non attrapée dans une route
// (y compris async, grâce à express-async-errors) atterrit ici au lieu
// de laisser la requête en suspens ou de crasher le serveur
app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.path}]`, err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: "Erreur serveur. Réessaie plus tard." });
});

// Socket.IO — auth + événements temps réel
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

async function joindreRoomsOptions(socket) {
  const user = await prisma.user.findUnique({
    where: { id: socket.user.id },
    select: { role: true, groupe: { select: { promo: true } }, options: { select: { optionId: true } } },
  });
  if (!user) return;
  socket.join(`user-${socket.user.id}`);
  socket.join(`promo-${user.groupe.promo}`);
  for (const { optionId } of user.options) socket.join(`option-${optionId}`);
  if (["admin", "delegue"].includes(user.role)) socket.join(`gestion-${user.groupe.promo}`);
}

io.on("connection", (socket) => {
  signalerConnexion(); // fait "battre" le dashboard Pulse

  // Rooms propres à l'utilisateur, calculées côté serveur depuis la base (jamais depuis
  // le client) : "user-X" pour le cibler, "option-X" pour ses options (issue #51) et
  // "gestion-PROMO" pour les admins/délégués, qui suivent toutes les options de leur promo
  joindreRoomsOptions(socket).catch((e) => console.warn("Rooms options ignorées :", e.message));

  // Un utilisateur ne peut rejoindre que la room de SON PROPRE groupe (les
  // événements temps réel de devoirs/EDT d'un autre groupe ne doivent pas fuiter)
  socket.on("rejoindreGroupe", (groupeId) => {
    if (socket.user.role !== "admin" && Number(groupeId) !== socket.user.groupeId) return;
    socket.join(`groupe-${groupeId}`);
  });

  socket.on("disconnect", () => {});
});

process.on("uncaughtException", (e) => console.error("uncaughtException:", e));
process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));

const UNE_HEURE_MS = 60 * 60 * 1000;

async function syncEdt() {
  try {
    const resultats = await syncTousLesGroupes();
    if (resultats.length) console.log("Sync EDT :", resultats);
  } catch (e) {
    console.warn("Sync EDT ignorée :", e.message);
  }
}

const QUINZE_MINUTES_MS = 15 * 60 * 1000;

async function rappels() {
  try {
    const n = await envoyerRappels();
    if (n) console.log(`Rappels de devoirs : ${n} devoir(s) traité(s)`);
    await purgerAnciennesNotifications();
  } catch (e) {
    console.warn("Rappels ignorés :", e.message);
  }
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, async () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  syncEdt();
  setInterval(syncEdt, UNE_HEURE_MS);
  rappels();
  setInterval(rappels, QUINZE_MINUTES_MS);
});
