// Synchronise l'emploi du temps de chaque groupe depuis son flux iCal ADE.
//
// Format ADE observé : un VEVENT à plat par séance (pas de RRULE), avec un UID stable
// par séance. On upsert donc chaque événement par UID, puis on supprime les cours du
// groupe dont l'UID n'apparaît plus dans le flux (créneau supprimé/déplacé côté ADE).
//
// La DESCRIPTION ADE n'a pas de format garanti ; l'extraction du prof est une
// heuristique best-effort (une ligne "NOM   Prénom" tout en majuscules), pas fiable à 100%.

import ical from "node-ical";
import prisma from "../db.js";

const MOTS_ANNULATION = /annul[ée]/i;

function extraireProf(description) {
  if (!description) return null;
  const lignes = description.split("\n").map((l) => l.trim());
  const ligneNom = lignes.find(
    (l) => l.length > 3 && /^[A-ZÀ-Ÿ][A-ZÀ-Ÿ'\- ]+$/.test(l) && !/^(TDB|TDA|TPA|TPB)\d*$/.test(l)
  );
  return ligneNom ?? null;
}

async function syncGroupe(groupe) {
  if (!groupe.icalUrl) return { groupe: groupe.nom, skipped: true };

  const data = await ical.async.fromURL(groupe.icalUrl);
  const evenements = Object.values(data).filter((e) => e.type === "VEVENT" && e.uid);

  const uidsVus = [];

  for (const e of evenements) {
    const uid = String(e.uid);
    uidsVus.push(uid);

    const texte = `${e.summary ?? ""} ${e.description ?? ""}`;
    const annule = MOTS_ANNULATION.test(texte) || e.status === "CANCELLED";

    await prisma.cours.upsert({
      where: { uid },
      create: {
        uid,
        matiere: e.summary ?? "Cours",
        dateDebut: e.start,
        dateFin: e.end,
        salle: e.location ?? null,
        prof: extraireProf(e.description),
        annule,
        groupeId: groupe.id,
      },
      update: {
        matiere: e.summary ?? "Cours",
        dateDebut: e.start,
        dateFin: e.end,
        salle: e.location ?? null,
        prof: extraireProf(e.description),
        annule,
      },
    });
  }

  // Nettoie les cours de ce groupe qui ne sont plus dans le flux (créneau
  // supprimé/déplacé côté ADE). On ne touche jamais aux cours ajoutés à la main (uid null).
  const { count: supprimes } = await prisma.cours.deleteMany({
    where: {
      groupeId: groupe.id,
      uid: { not: null, notIn: uidsVus },
    },
  });

  return { groupe: groupe.nom, importes: evenements.length, supprimes };
}

export async function syncTousLesGroupes() {
  const groupes = await prisma.groupe.findMany({ where: { icalUrl: { not: null } } });
  const resultats = [];
  for (const groupe of groupes) {
    try {
      resultats.push(await syncGroupe(groupe));
    } catch (err) {
      console.error(`Erreur sync EDT groupe ${groupe.nom}:`, err.message);
      resultats.push({ groupe: groupe.nom, error: err.message });
    }
  }
  return resultats;
}

export async function syncUnGroupe(groupeId) {
  const groupe = await prisma.groupe.findUnique({ where: { id: groupeId } });
  if (!groupe) throw new Error("Groupe introuvable.");
  if (!groupe.icalUrl) throw new Error("Ce groupe n'a pas de flux iCal configuré.");
  return syncGroupe(groupe);
}
