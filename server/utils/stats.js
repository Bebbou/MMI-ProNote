// Compteur de requêtes en mémoire, lu par le dashboard Pulse (route GET /stats).
// Les chiffres repartent de zéro à chaque redémarrage du serveur (un déploiement Railway
// compris) : le "total" est donc depuis le dernier démarrage, pas depuis toujours.

const UNE_HEURE_MS = 60 * 60 * 1000;
const FENETRE_HEURES = 24;

const demarreLe = Date.now();
let total = 0;
const parHeure = new Map(); // début d'heure (ms) -> { requetes, erreurs }

// Retourne le "seau" de l'heure en cours, et oublie ceux qui sortent de la fenêtre de 24 h
function seauCourant(maintenant = Date.now()) {
  const cle = Math.floor(maintenant / UNE_HEURE_MS) * UNE_HEURE_MS;
  let seau = parHeure.get(cle);
  if (!seau) {
    seau = { requetes: 0, erreurs: 0 };
    parHeure.set(cle, seau);
    const limite = cle - FENETRE_HEURES * UNE_HEURE_MS;
    for (const k of parHeure.keys()) if (k < limite) parHeure.delete(k);
  }
  return seau;
}

// Middleware : compte chaque requête une fois sa réponse envoyée (on connaît alors le statut).
// On ignore la page d'accueil, /stats (le dashboard ne se compte pas lui-même) et les
// requêtes OPTIONS (préflight CORS), qui ne sont pas du vrai trafic.
export function compteRequetes(req, res, next) {
  const estStats = req.path === "/stats" || req.path.startsWith("/stats/");
  if (req.method === "OPTIONS" || req.path === "/" || estStats) return next();
  res.on("finish", () => {
    const seau = seauCourant();
    seau.requetes++;
    total++;
    if (res.statusCode >= 500) seau.erreurs++;
    diffuser("requete");
  });
  next();
}

// ---------------------------------------------------------------------------
// Flux en direct (Server-Sent Events) : le dashboard Pulse s'y abonne pour faire
// "battre" son tracé à chaque événement réel. Seuls un type et un nombre sont envoyés,
// jamais de chemin d'URL, d'IP ni d'identité.
// ---------------------------------------------------------------------------

const MAX_CLIENTS = 100;
const clients = new Set();
const enAttente = { requete: 0, connexion: 0 };
let minuteur = null;

// Regroupe les événements sur 150 ms : un pic de trafic ne noie pas les clients
function diffuser(type) {
  if (!clients.size) return; // personne n'écoute : rien à faire
  enAttente[type]++;
  if (minuteur) return;
  minuteur = setTimeout(() => {
    minuteur = null;
    for (const t of Object.keys(enAttente)) {
      const n = enAttente[t];
      if (!n) continue;
      enAttente[t] = 0;
      const message = `data: ${JSON.stringify({ type: t, n })}\n\n`;
      for (const envoyer of clients) envoyer(message);
    }
  }, 150);
}

// Un utilisateur vient de se connecter en temps réel (Socket.IO)
export function signalerConnexion() {
  diffuser("connexion");
}

export function fluxEvenements(req, res) {
  if (clients.size >= MAX_CLIENTS) {
    return res.status(503).json({ error: "Trop de connexions en direct." });
  }
  // no-transform : empêche compression() de mettre le flux en mémoire tampon
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const envoyer = (texte) => {
    res.write(texte);
    res.flush?.();
  };
  envoyer("retry: 5000\n\n"); // en cas de coupure, le navigateur retente après 5 s
  clients.add(envoyer);

  // Un commentaire toutes les 25 s garde la connexion ouverte à travers les proxys
  const maintien = setInterval(() => envoyer(": ping\n\n"), 25 * 1000);
  req.on("close", () => {
    clearInterval(maintien);
    clients.delete(envoyer);
  });
}

export function lireStats(io, maintenant = Date.now()) {
  const debut = maintenant - FENETRE_HEURES * UNE_HEURE_MS;
  let requetes = 0;
  let erreurs = 0;
  for (const [cle, seau] of parHeure) {
    if (cle <= debut) continue;
    requetes += seau.requetes;
    erreurs += seau.erreurs;
  }
  return {
    requests: requetes, // requêtes des dernières 24 h
    errors: erreurs, // dont les erreurs 5xx
    total, // depuis le dernier démarrage
    uptime: Math.round((maintenant - demarreLe) / 1000), // secondes
    sockets: io?.engine?.clientsCount ?? 0, // utilisateurs connectés en temps réel
    startedAt: new Date(demarreLe).toISOString(),
  };
}

// Pour les tests uniquement
export function reinitialiserStats() {
  total = 0;
  parHeure.clear();
  clients.clear();
  enAttente.requete = 0;
  enAttente.connexion = 0;
  if (minuteur) clearTimeout(minuteur);
  minuteur = null;
}
