import prisma from "../db.js";

// Qui voit quel devoir (issue #51) :
//  - devoir sans option : tout le groupe qui l'a reçu
//  - devoir d'option (ex. "Anglais renforcé") : uniquement les membres de l'option, quel
//    que soit leur groupe. Les admins et délégués de la promo voient aussi les devoirs
//    d'options de leur promo : ce sont eux qui les créent, ils doivent pouvoir les gérer.

const ROLES_GESTION = ["admin", "delegue"];

export function estGestionnaire(user) {
  return ROLES_GESTION.includes(user.role);
}

export async function idsOptionsDe(userId) {
  const liens = await prisma.userOption.findMany({ where: { userId }, select: { optionId: true } });
  return liens.map((l) => l.optionId);
}

// Clause `where` Prisma : les devoirs visibles par cet utilisateur
export function filtreDevoirsVisibles(user, optionIds) {
  return {
    OR: [
      { optionId: null, groupeId: user.groupeId },
      { optionId: { in: optionIds } },
      ...(estGestionnaire(user) ? [{ option: { promo: user.promo } }] : []),
    ],
  };
}

// Même règle appliquée à un devoir déjà chargé ({ groupeId, optionId, option?: { promo } })
export function devoirEstVisible(user, optionIds, devoir) {
  if (devoir.optionId == null) return devoir.groupeId === user.groupeId;
  if (optionIds.includes(devoir.optionId)) return true;
  return estGestionnaire(user) && devoir.option?.promo === user.promo;
}

// Charge un devoir et vérifie qu'il est visible par l'utilisateur ; répond directement
// (404/403) et renvoie null sinon
export async function chargerDevoirVisible(req, res, id, select = {}) {
  const devoir = await prisma.devoir.findUnique({
    where: { id },
    select: { id: true, groupeId: true, optionId: true, option: { select: { promo: true } }, ...select },
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

// Rooms Socket.IO destinataires des événements d'un devoir : le groupe, ou pour une
// option ses membres + les gestionnaires (admins/délégués) de la promo
export function roomsDevoir(devoir) {
  if (devoir.optionId == null) return [`groupe-${devoir.groupeId}`];
  return [`option-${devoir.optionId}`, `gestion-${devoir.option.promo}`];
}
