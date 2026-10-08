// "il y a 5 min", "il y a 3 h", "hier", "il y a 4 j" : l'âge d'une notification

export function depuis(iso, now = new Date()) {
  const minutes = Math.max(0, Math.floor((now - new Date(iso)) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours === 1) return "hier";
  if (jours < 30) return `il y a ${jours} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
