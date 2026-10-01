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
  if (req.method === "OPTIONS" || req.path === "/" || req.path === "/stats") return next();
  res.on("finish", () => {
    const seau = seauCourant();
    seau.requetes++;
    total++;
    if (res.statusCode >= 500) seau.erreurs++;
  });
  next();
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
}
