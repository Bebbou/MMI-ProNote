import prisma from "../db.js";
import { sendPushToDevoir } from "../utils/push.js";

// Rappel automatique : quand l'échéance d'un devoir passe sous les 24h, on prévient ceux
// qui ne l'ont pas encore marqué comme rendu. Un seul rappel par devoir (`rappelEnvoye`).

const FENETRE_MS = 24 * 60 * 60 * 1000;
const FUSEAU = "Europe/Paris"; // le serveur tourne en UTC : on formate toujours à l'heure française

export function dansLaFenetre(dateLimite, now = new Date()) {
  const delta = new Date(dateLimite) - now;
  return delta > 0 && delta <= FENETRE_MS;
}

// "aujourd'hui à 09:30" / "demain à 09:30"
export function quandLibelle(dateLimite, now = new Date()) {
  const jour = (d) => d.toLocaleDateString("fr-CA", { timeZone: FUSEAU }); // AAAA-MM-JJ
  const date = new Date(dateLimite);
  const heure = date.toLocaleTimeString("fr-FR", { timeZone: FUSEAU, hour: "2-digit", minute: "2-digit" });
  const estAujourdhui = jour(date) === jour(now);
  return `${estAujourdhui ? "aujourd'hui" : "demain"} à ${heure}`;
}

export function payloadRappel(devoir, now = new Date()) {
  const quoi = devoir.type === "Evaluation" ? "Évaluation" : "Devoir";
  return {
    title: `Rappel · ${devoir.matiere}`,
    body: `${quoi} « ${devoir.titre} » : à rendre ${quandLibelle(devoir.dateLimite, now)}`,
    url: "/devoirs",
    tag: `rappel-${devoir.id}`,
  };
}

export async function envoyerRappels(now = new Date()) {
  const devoirs = await prisma.devoir.findMany({
    where: {
      rappelEnvoye: false,
      dateLimite: { gt: now, lte: new Date(now.getTime() + FENETRE_MS) },
    },
  });

  for (const devoir of devoirs) {
    // On "réserve" le rappel avant d'envoyer : si deux instances tournent en même temps,
    // une seule obtient count === 1 et envoie
    const reserve = await prisma.devoir.updateMany({
      where: { id: devoir.id, rappelEnvoye: false },
      data: { rappelEnvoye: true },
    });
    if (reserve.count === 0) continue;
    await sendPushToDevoir(devoir, payloadRappel(devoir, now));
  }
  return devoirs.length;
}
