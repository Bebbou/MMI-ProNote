// Renomme les groupes TP -> TD (une seule fois, à lancer après le déploiement du nouveau code).
// Usage : node scripts/rename-groupes.js
// Assure-toi que DATABASE_URL (dans l'environnement ou .env) pointe bien vers la bonne base.

import prisma from "../db.js";

const RENOMMAGES = [
  { de: "TPA1", vers: "TDA1" },
  { de: "TPA2", vers: "TDA2" },
  { de: "TPB1", vers: "TDB1" },
  { de: "TPB2", vers: "TDB2" },
];

async function main() {
  for (const { de, vers } of RENOMMAGES) {
    const existant = await prisma.groupe.findUnique({ where: { nom: de } });
    if (!existant) {
      console.log(`Groupe "${de}" introuvable, ignoré.`);
      continue;
    }
    await prisma.groupe.update({ where: { nom: de }, data: { nom: vers } });
    console.log(`Groupe "${de}" renommé en "${vers}".`);
  }

  // Renomme aussi les canaux de chat correspondants (garde l'historique des messages,
  // contrairement à un supprimer/recréer).
  for (const { de, vers } of RENOMMAGES) {
    const canal = await prisma.channel.findUnique({ where: { nom: de } });
    if (!canal) {
      console.log(`Canal "${de}" introuvable, ignoré.`);
      continue;
    }
    await prisma.channel.update({
      where: { id: canal.id },
      data: { nom: vers, description: `Canal du groupe ${vers}` },
    });
    console.log(`Canal "${de}" renommé en "${vers}" (historique conservé).`);
  }

  console.log("Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
