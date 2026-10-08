-- Issue #25 : un professeur (ou un admin) peut créer un devoir pour toute une promo,
-- sans être rattaché à un groupe en particulier.

ALTER TABLE "Devoir" ADD COLUMN "promoCible" TEXT;
