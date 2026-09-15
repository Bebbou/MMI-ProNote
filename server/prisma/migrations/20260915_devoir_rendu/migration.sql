-- Suivi "j'ai rendu ce devoir" par étudiant (issue #36 : le badge "En retard" ne
-- disparaissait jamais et il n'y avait aucun moyen de marquer un devoir comme fait).

CREATE TABLE "DevoirRendu" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devoirId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "DevoirRendu_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DevoirRendu_devoirId_userId_key" ON "DevoirRendu"("devoirId", "userId");

ALTER TABLE "DevoirRendu" ADD CONSTRAINT "DevoirRendu_devoirId_fkey"
    FOREIGN KEY ("devoirId") REFERENCES "Devoir"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DevoirRendu" ADD CONSTRAINT "DevoirRendu_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
