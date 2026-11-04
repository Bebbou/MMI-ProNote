// Aides pour la bande "Cette semaine" et l'anneau des devoirs. Fonctions pures,
// `now` injectable pour les tests.

// Lundi 00:00 de la semaine qui contient `now` (getDay() : dimanche = 0, donc le décalage
// ramène dimanche à 6 jours après le lundi)
export function debutDeSemaine(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Les 5 jours ouvrés (lundi à vendredi) de la semaine courante
export function joursOuvres(now = new Date()) {
  const debut = debutDeSemaine(now);
  return Array.from({ length: 5 }, (_, i) => {
    const jour = new Date(debut);
    jour.setDate(debut.getDate() + i);
    return jour;
  });
}

export function memeJour(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
