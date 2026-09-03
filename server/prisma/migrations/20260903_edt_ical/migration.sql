-- Passage de l'EDT d'une grille hebdo récurrente (jour/heureDebut/heureFin) à un vrai
-- calendrier daté, alimenté par synchronisation automatique des flux iCal ADE.
-- Les anciennes données de "Cours" (saisies à la main, format incompatible) sont vidées.

DELETE FROM "Cours";

ALTER TABLE "Cours" DROP COLUMN "jour";
ALTER TABLE "Cours" DROP COLUMN "heureDebut";
ALTER TABLE "Cours" DROP COLUMN "heureFin";

ALTER TABLE "Cours" ADD COLUMN "dateDebut" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Cours" ADD COLUMN "dateFin" TIMESTAMP(3) NOT NULL;
ALTER TABLE "Cours" ADD COLUMN "annule" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cours" ADD COLUMN "uid" TEXT;

CREATE UNIQUE INDEX "Cours_uid_key" ON "Cours"("uid");
CREATE INDEX "Cours_groupeId_dateDebut_idx" ON "Cours"("groupeId", "dateDebut");

ALTER TABLE "Groupe" ADD COLUMN "icalUrl" TEXT;
