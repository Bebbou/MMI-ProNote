// Supprime le canal de chat "TDB2" et, si personne n'y est rattaché, le groupe "TDB2"
// (qui n'existe plus dans la réalité). À lancer une seule fois contre la vraie base.
//
// Usage : DATABASE_URL="..." node scripts/supprimer-tdb2.js

import prisma from "../db.js";

async function main() {
  const canal = await prisma.channel.findUnique({ where: { nom: "TDB2" } });
  if (canal) {
    await prisma.channel.delete({ where: { id: canal.id } });
    console.log("Canal de chat TDB2 supprimé.");
  } else {
    console.log("Canal de chat TDB2 introuvable, rien à faire.");
  }

  const groupe = await prisma.groupe.findUnique({ where: { nom: "TDB2" } });
  if (!groupe) {
    console.log("Groupe TDB2 introuvable en base, rien à faire.");
    return;
  }

  const nbUtilisateurs = await prisma.user.count({ where: { groupeId: groupe.id } });
  if (nbUtilisateurs > 0) {
    console.log(
      `ATTENTION: ${nbUtilisateurs} compte(s) sont encore rattachés au groupe TDB2. ` +
        "Réassigne-les d'abord (panel Admin) avant de relancer ce script — le groupe n'a pas été supprimé."
    );
    return;
  }

  const nbCours = await prisma.cours.count({ where: { groupeId: groupe.id } });
  if (nbCours > 0) {
    await prisma.cours.deleteMany({ where: { groupeId: groupe.id } });
    console.log(`${nbCours} cours orphelins du groupe TDB2 supprimés.`);
  }

  const nbDevoirs = await prisma.devoir.count({ where: { groupeId: groupe.id } });
  if (nbDevoirs > 0) {
    console.log(
      `ATTENTION: ${nbDevoirs} devoir(s) existent encore pour le groupe TDB2. ` +
        "Le groupe n'a pas été supprimé (vérifie manuellement avant de forcer)."
    );
    return;
  }

  await prisma.groupe.delete({ where: { id: groupe.id } });
  console.log("Groupe TDB2 supprimé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
