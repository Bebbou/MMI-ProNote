// Aide à l'affichage des échéances de devoirs : regroupement "agenda" et libellés
// relatifs ("Demain", "lun. 12 oct."). Fonctions pures, `now` injectable pour les tests.

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

export const GROUPES = [
  { id: "retard", label: "Échéance dépassée" },
  { id: "aujourdhui", label: "Aujourd'hui" },
  { id: "demain", label: "Demain" },
  { id: "semaine", label: "Cette semaine" },
  { id: "plusTard", label: "Plus tard" },
];

function debutDeJournee(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Nombre de jours calendaires entre aujourd'hui et la date (0 = aujourd'hui, 1 = demain).
// Math.round absorbe les décalages de 1h des changements d'heure.
function joursRestants(iso, now) {
  return Math.round((debutDeJournee(iso) - debutDeJournee(now)) / UN_JOUR_MS);
}

export function groupeEcheance(iso, now = new Date()) {
  if (new Date(iso) < now) return "retard";
  const jours = joursRestants(iso, now);
  if (jours === 0) return "aujourdhui";
  if (jours === 1) return "demain";
  if (jours <= 7) return "semaine";
  return "plusTard";
}

// Urgence visuelle : "retard" (rouge, uniquement dans les 24h suivant l'échéance, cf.
// issue #36), "depasse" (échéance passée depuis plus longtemps : neutre), "urgent"
// (aujourd'hui ou demain), "proche" (dans la semaine), "normal".
export function urgenceEcheance(iso, now = new Date()) {
  const retardMs = now - new Date(iso);
  if (retardMs > 0) return retardMs < UN_JOUR_MS ? "retard" : "depasse";
  const jours = joursRestants(iso, now);
  if (jours <= 1) return "urgent";
  if (jours <= 7) return "proche";
  return "normal";
}

// { principal: "Demain", secondaire: "09:30" } pour l'affichage en deux lignes
export function libelleEcheance(iso, now = new Date()) {
  const date = new Date(iso);
  const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const jours = joursRestants(iso, now);

  let principal;
  if (jours === 0) principal = "Aujourd'hui";
  else if (jours === 1) principal = "Demain";
  else if (jours === -1) principal = "Hier";
  else {
    principal = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  }

  const secondaire = jours >= 2 && jours <= 7 ? `${heure} · dans ${jours} jours` : heure;
  return { principal, secondaire };
}
