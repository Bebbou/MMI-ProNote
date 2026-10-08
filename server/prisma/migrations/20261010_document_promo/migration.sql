-- Issue #49 : les cours s'affichaient pour toutes les promos. Chaque document est
-- désormais destiné à une promo. Les documents existants héritent de la promo de leur
-- auteur (l'admin qui les a publiés) ; un admin peut ensuite les rediriger vers une autre promo.

ALTER TABLE "Document" ADD COLUMN "promo" TEXT;

UPDATE "Document" d
SET "promo" = g."promo"
FROM "User" u
JOIN "Groupe" g ON g."id" = u."groupeId"
WHERE u."id" = d."auteurId";

ALTER TABLE "Document" ALTER COLUMN "promo" SET NOT NULL;

CREATE INDEX "Document_promo_idx" ON "Document"("promo");
