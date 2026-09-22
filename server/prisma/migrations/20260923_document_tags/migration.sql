-- Issue #37 : distinguer les documents par enseignant et par type de séance
-- (CM/TD/TP/Projet), en plus de la ressource (matiere).

ALTER TABLE "Document" ADD COLUMN "prof" TEXT;
ALTER TABLE "Document" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'Autre';
