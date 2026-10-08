import prisma from "../db.js";

// Qui voit et qui gère quel devoir (issues #51 et #25) :
//  - devoir de groupe : les membres du groupe ciblé
//  - devoir de promo (`promoCible`, créé par un prof ou un admin) : toute la promo
//  - devoir d'option (ex. "Anglais renforcé") : uniquement les membres de l'option, quel
//    que soit leur groupe. Les admins et délégués de la promo voient aussi les options de
//    leur promo : ce sont eux qui les gèrent.
//  - un professeur ou un admin voit toujours les devoirs qu'il a créés, quelle que soit leur cible
// Gérer (modifier/supprimer) : un admin gère tout ; un professeur ses propres devoirs ; un
// délégué ceux qu'il voit, sauf ceux d'un professeur.

export function estGestionnaire(user) {
  return ["admin", "delegue"].includes(user.role);
}

// Admins et professeurs peuvent cibler n'importe quel groupe ou promo ; un délégué reste
// limité à son groupe et aux options de sa promo
export function peutCiblerLibrement(user) {
  return ["admin", "professeur"].includes(user.role);
}

export async function idsOptionsDe(userId) {
  const liens = await prisma.userOption.findMany({ where: { userId }, select: { optionId: true } });
  return liens.map((l) => l.optionId);
}

// Clause `where` Prisma : les devoirs visibles par cet utilisateur
export function filtreDevoirsVisibles(user, optionIds) {
  return {
    OR: [
      { optionId: null, promoCible: null, groupeId: user.groupeId },
      { optionId: null, promoCible: user.promo },
      { optionId: { in: optionIds } },
      ...(estGestionnaire(user) ? [{ option: { promo: user.promo } }] : []),
      ...(peutCiblerLibrement(user) ? [{ auteurId: user.id }] : []),
    ],
  };
}

// Même règle appliquée à un devoir déjà chargé
// ({ groupeId, optionId, promoCible, auteurId, option?: { promo } })
export function devoirEstVisible(user, optionIds, devoir) {
  if (peutCiblerLibrement(user) && devoir.auteurId === user.id) return true;
  if (devoir.optionId != null) {
    return (
      optionIds.includes(devoir.optionId) || (estGestionnaire(user) && devoir.option?.promo === user.promo)
    );
  }
  if (devoir.promoCible != null) return devoir.promoCible === user.promo;
  return devoir.groupeId === user.groupeId;
}

// ({ auteurId, auteur: { role } }) : droit de modifier/supprimer un devoir déjà visible
export function peutGererDevoir(user, devoir) {
  if (user.role === "admin") return true;
  if (user.role === "professeur") return devoir.auteurId === user.id;
  if (user.role === "delegue") return devoir.auteur?.role !== "professeur";
  return false;
}

// Charge un devoir et vérifie qu'il est visible par l'utilisateur ; répond directement
// (404/403) et renvoie null sinon
export async function chargerDevoirVisible(req, res, id, select = {}) {
  const devoir = await prisma.devoir.findUnique({
    where: { id },
    select: {
      id: true,
      groupeId: true,
      optionId: true,
      promoCible: true,
      auteurId: true,
      auteur: { select: { role: true } },
      option: { select: { promo: true } },
      groupe: { select: { promo: true } },
      ...select,
    },
  });
  if (!devoir) {
    res.status(404).json({ error: "Devoir introuvable." });
    return null;
  }
  const optionIds = devoir.optionId == null ? [] : await idsOptionsDe(req.user.id);
  if (!devoirEstVisible(req.user, optionIds, devoir)) {
    res.status(403).json({ error: "Accès refusé." });
    return null;
  }
  return devoir;
}

// Rooms Socket.IO destinataires des événements d'un devoir : sa cible (groupe, promo, ou
// option + gestionnaires de la promo) et toujours son auteur, qui peut être hors de la cible
export function roomsDevoir(devoir) {
  const auteur = `user-${devoir.auteurId}`;
  if (devoir.optionId != null) return [`option-${devoir.optionId}`, `gestion-${devoir.option.promo}`, auteur];
  if (devoir.promoCible != null) return [`promo-${devoir.promoCible}`, auteur];
  return [`groupe-${devoir.groupeId}`, auteur];
}
