-- Issue #51 : distinguer les devoirs des évaluations (filtre "agenda de rendu") et
-- permettre de commenter un devoir (consignes, précisions du délégué, questions).

ALTER TABLE "Devoir" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'Devoir';

CREATE TABLE "CommentaireDevoir" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auteurId" INTEGER NOT NULL,
    "devoirId" INTEGER NOT NULL,

    CONSTRAINT "CommentaireDevoir_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommentaireDevoir_devoirId_idx" ON "CommentaireDevoir"("devoirId");

ALTER TABLE "CommentaireDevoir" ADD CONSTRAINT "CommentaireDevoir_auteurId_fkey"
    FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommentaireDevoir" ADD CONSTRAINT "CommentaireDevoir_devoirId_fkey"
    FOREIGN KEY ("devoirId") REFERENCES "Devoir"("id") ON DELETE CASCADE ON UPDATE CASCADE;
