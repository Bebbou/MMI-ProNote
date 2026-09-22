// Crée les 4 groupes MMI3 (TDA1, TDA2, TDB1, TDB2), sans flux iCal pour l'instant
// (à renseigner ensuite dans le panel Admin, une fois les liens ADE récupérés).
// Sans danger à relancer plusieurs fois : upsert, ne duplique rien.
//
// Usage : DATABASE_URL="..." node scripts/ajouter-mmi3.js

import prisma from "../db.js";

const GROUPES_MMI3 = ["TDA1", "TDA2", "TDB1", "TDB2"];

async function main() {
  for (const nom of GROUPES_MMI3) {
    const groupe = await prisma.groupe.upsert({
      where: { nom_promo: { nom, promo: "MMI3" } },
      update: {},
      create: { nom, promo: "MMI3" },
    });
    console.log(`Groupe "${nom}" (MMI3) prêt — id ${groupe.id}.`);
  }
  console.log(
    "Terminé. Le canal \"Annonces MMI3\" se crée automatiquement au prochain démarrage du serveur."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
