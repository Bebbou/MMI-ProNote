import prisma from "../db.js";
import { sendPushToUsers } from "./push.js";

// Point d'entrée unique des notifications. Pour chaque envoi :
//  1. on retient les destinataires qui n'ont pas désactivé cette catégorie (Profil)
//  2. on écrit la notification dans leur historique (la cloche de l'application), ce qui
//     fonctionne même pour ceux qui n'ont pas activé le push (ex. iPhone sans installation)
//  3. on envoie le push aux appareils abonnés

// Catégorie -> colonne de préférence de l'utilisateur
export const PREFS = {
  devoir: "notifDevoirs", // nouveaux devoirs et évaluations
  rappel: "notifRappels", // rappel la veille d'une échéance
  cours: "notifCours", // nouveaux cours
  annonce: "notifAnnonces", // annonces de la promo
};

// Clause Prisma `User` : à qui s'adresse un devoir (option, promo entière ou groupe)
export function ciblesDevoir(devoir) {
  if (devoir.optionId) return { options: { some: { optionId: devoir.optionId } } };
  if (devoir.promoCible) return { groupe: { promo: devoir.promoCible } };
  return { groupeId: devoir.groupeId };
}

// `where` : clause Prisma sur User. `payload` : { title, body, url, tag } (format du push).
// Renvoie le nombre de destinataires.
export async function notifier({ where, categorie, payload, exclureUserId }) {
  const pref = PREFS[categorie];
  if (!pref) throw new Error(`Catégorie de notification inconnue : ${categorie}`);

  const users = await prisma.user.findMany({
    where: {
      ...where,
      valide: true,
      [pref]: true,
      ...(exclureUserId ? { id: { not: exclureUserId } } : {}),
    },
    select: { id: true },
  });
  if (users.length === 0) return 0;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      categorie,
      titre: payload.title,
      corps: payload.body,
      url: payload.url ?? "/",
    })),
  });
  await sendPushToUsers(
    users.map((u) => u.id),
    payload
  );
  return users.length;
}

// Un échec de notification ne doit jamais faire échouer l'action qui l'a déclenchée
// (publier un devoir, un cours...) : on journalise et on continue.
export function notifierSansBloquer(args) {
  return notifier(args).catch((err) => console.warn("[notifier] échec :", err.message));
}
