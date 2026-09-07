-- L'UID d'un événement iCal ADE n'est pas unique globalement : un cours partagé entre
-- plusieurs groupes (CM commun, TD partagé A/B...) porte le même UID dans le flux de
-- chacun des groupes qui y assistent. L'unicité doit donc porter sur (groupeId, uid),
-- pas sur uid seul, sinon un seul groupe (le premier synchronisé) garde la ligne.

DROP INDEX "Cours_uid_key";

CREATE UNIQUE INDEX "Cours_groupeId_uid_key" ON "Cours"("groupeId", "uid");
