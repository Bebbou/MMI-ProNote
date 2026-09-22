-- Préparation à l'ouverture de l'app aux MMI3 : les groupes (TDA1, TDA2, TDB1, TDB2)
-- sont réutilisés d'une promo à l'autre, donc le nom seul ne suffit plus à les
-- distinguer. On ajoute une notion de "promo" et on simplifie les canaux de chat :
-- suppression des canaux par groupe/filière (trop complexes à faire cohabiter entre
-- promos), on garde uniquement "général" (partagé) et "Annonces" (séparé par promo).

-- Groupe : ajout de la promo, toutes les lignes existantes sont de la promo MMI2
ALTER TABLE "Groupe" ADD COLUMN "promo" TEXT NOT NULL DEFAULT 'MMI2';
DROP INDEX "Groupe_nom_key";
CREATE UNIQUE INDEX "Groupe_nom_promo_key" ON "Groupe"("nom", "promo");

-- Channel : ajout de la promo (nullable = canal partagé, ex. "général")
ALTER TABLE "Channel" ADD COLUMN "promo" TEXT;
DROP INDEX "Channel_nom_key";
CREATE UNIQUE INDEX "Channel_nom_promo_key" ON "Channel"("nom", "promo");

-- L'éventuel canal "Annonces" déjà existant devient celui de la promo MMI2
UPDATE "Channel" SET "promo" = 'MMI2' WHERE "nom" = 'Annonces';

-- Retrait des anciens canaux par groupe/filière, devenus ambigus entre promos
-- (les messages qu'ils contiennent sont aussi supprimés, en cascade)
DELETE FROM "Channel" WHERE "nom" IN ('TDA1', 'TDA2', 'TDB1', 'TDB2', 'TDA', 'TDB');
