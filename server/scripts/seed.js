// Données de test pour le développement local : groupes, comptes de chaque rôle, une option,
// des devoirs, des cours et deux PDF de promos différentes. Rejouable sans danger (upsert).
//
// Usage (base locale, voir docker-compose.yml) :
//   cd server && npm run db:push && npm run seed
//
// `db:push` (et non `migrate deploy`) : l'historique de migrations suppose que les tables de
// base (User, Groupe, Devoir...) existent déjà et ne peut pas construire une base vide.
//
// SÉCURITÉ : refuse de tourner si DATABASE_URL ne pointe pas vers la machine locale, pour ne
// jamais semer de faux comptes dans la base de production. SEED_FORCE=1 pour passer outre.

import bcrypt from "bcryptjs";
import prisma from "../db.js";

const url = process.env.DATABASE_URL ?? "";
const estLocale = /@(localhost|127\.0\.0\.1|\[::1\])(:|\/)/.test(url);
if (!estLocale && process.env.SEED_FORCE !== "1") {
  console.error("Refus : DATABASE_URL ne pointe pas vers une base locale.");
  console.error("Ce script crée de faux comptes ; il ne doit jamais tourner sur la production.");
  process.exit(1);
}

// Mot de passe commun à tous les comptes de test (jamais utilisé en production)
const MOT_DE_PASSE = "test1234";

const HEURE = 60 * 60 * 1000;
const JOUR = 24 * HEURE;
const dans = (ms) => new Date(Date.now() + ms);

// Plus petit PDF valide possible, suffisant pour tester l'upload/téléchargement
const PDF = (texte) =>
  Buffer.from(
    `%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n` +
      `3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]/Contents 4 0 R>>endobj\n` +
      `4 0 obj<</Length ${texte.length + 30}>>stream\nBT /F1 12 Tf 10 50 Td (${texte}) Tj ET\nendstream endobj\n` +
      `trailer<</Root 1 0 R>>\n%%EOF\n`
  );

async function groupe(nom, promo) {
  return prisma.groupe.upsert({ where: { nom_promo: { nom, promo } }, update: {}, create: { nom, promo } });
}

async function utilisateur(nom, email, role, g) {
  const password = await bcrypt.hash(MOT_DE_PASSE, 10);
  return prisma.user.upsert({
    where: { email },
    update: { nom, role, groupeId: g.id, valide: true },
    create: { nom, email, password, role, groupeId: g.id, valide: true },
  });
}

async function main() {
  const [a1, a2, b1] = await Promise.all([
    groupe("TDA1", "MMI2"),
    groupe("TDA2", "MMI2"),
    groupe("TDB1", "MMI2"),
  ]);
  const m3 = await groupe("TDA1", "MMI3");

  const admin = await utilisateur("Admin Test", "admin@test.local", "admin", a1);
  const delegue = await utilisateur("Delegue Test", "delegue@test.local", "delegue", a1);
  const prof = await utilisateur("Prof Test", "prof@test.local", "professeur", a1);
  const eleveA1 = await utilisateur("Eleve TDA1", "eleve.a1@test.local", "etudiant", a1);
  const eleveA2 = await utilisateur("Eleve TDA2", "eleve.a2@test.local", "etudiant", a2);
  const eleveB1 = await utilisateur("Eleve TDB1", "eleve.b1@test.local", "etudiant", b1);
  await utilisateur("Eleve MMI3", "eleve.mmi3@test.local", "etudiant", m3);

  // Anglais renforcé : des élèves répartis dans plusieurs groupes (cas de l'issue #51)
  const option = await prisma.option.upsert({
    where: { nom_promo: { nom: "Anglais renforcé", promo: "MMI2" } },
    update: {},
    create: { nom: "Anglais renforcé", promo: "MMI2" },
  });
  for (const u of [eleveA1, eleveB1]) {
    await prisma.userOption.upsert({
      where: { userId_optionId: { userId: u.id, optionId: option.id } },
      update: {},
      create: { userId: u.id, optionId: option.id },
    });
  }

  // Devoirs : on repart de zéro pour ne pas accumuler de doublons à chaque rejeu
  await prisma.devoir.deleteMany({ where: { auteurId: { in: [delegue.id, prof.id, admin.id] } } });
  const devoirs = [
    {
      titre: "Maquette Figma de la page d'accueil",
      matiere: "Design",
      groupeId: a1.id,
      auteurId: delegue.id,
      dateLimite: dans(JOUR + 2 * HEURE),
      description: "Format A4, export PDF.\nÀ déposer sur l'espace de cours.",
    },
    {
      titre: "Rendu en retard (hier)",
      matiere: "Web",
      groupeId: a1.id,
      auteurId: delegue.id,
      dateLimite: dans(-3 * HEURE),
    },
    {
      titre: "QCM de fin de ressource",
      matiere: "R312",
      type: "Evaluation",
      groupeId: a1.id,
      promoCible: "MMI2",
      auteurId: prof.id,
      dateLimite: dans(3 * JOUR),
    },
    {
      titre: "Oral en anglais",
      matiere: "Anglais",
      type: "Evaluation",
      groupeId: a1.id,
      optionId: option.id,
      auteurId: delegue.id,
      dateLimite: dans(5 * JOUR),
    },
    {
      titre: "Devoir du groupe TDA2 uniquement",
      matiere: "Web",
      groupeId: a2.id,
      auteurId: admin.id,
      dateLimite: dans(2 * JOUR),
    },
  ];
  for (const d of devoirs) await prisma.devoir.create({ data: { ...d, rappelEnvoye: false } });

  // Deux cours de promos différentes : un élève MMI2 ne doit voir que le premier
  await prisma.document.deleteMany({ where: { titre: { startsWith: "[TEST]" } } });
  for (const [titre, promo] of [
    ["[TEST] Cours MMI2", "MMI2"],
    ["[TEST] Cours MMI3", "MMI3"],
  ]) {
    const contenu = PDF(titre);
    await prisma.document.create({
      data: {
        titre,
        matiere: "Web",
        type: "CM",
        promo,
        fileName: "test.pdf",
        fileSize: contenu.length,
        fileData: contenu,
        auteurId: prof.id,
      },
    });
  }

  // Emploi du temps de TDA1
  await prisma.cours.deleteMany({ where: { groupeId: a1.id, uid: null } });
  await prisma.cours.createMany({
    data: [
      {
        matiere: "Web",
        dateDebut: dans(2 * HEURE),
        dateFin: dans(4 * HEURE),
        salle: "B12",
        prof: "Prof Test",
        groupeId: a1.id,
      },
      {
        matiere: "Design",
        dateDebut: dans(JOUR + 2 * HEURE),
        dateFin: dans(JOUR + 4 * HEURE),
        salle: "A03",
        prof: "Prof Test",
        groupeId: a1.id,
      },
    ],
  });

  console.log("Base de test prête.\n");
  console.log("Comptes (mot de passe commun : voir MOT_DE_PASSE dans scripts/seed.js) :");
  for (const e of ["admin", "delegue", "prof", "eleve.a1", "eleve.a2", "eleve.b1", "eleve.mmi3"]) {
    console.log(`  ${e}@test.local`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
