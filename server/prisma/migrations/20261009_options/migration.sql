-- Issue #51 : options transversales aux groupes (ex. anglais renforcé : 10 élèves
-- répartis dans 3 groupes). Un devoir peut être rattaché à une option : il n'est alors
-- visible que par les membres de cette option.

CREATE TABLE "Option" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "promo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Option_nom_promo_key" ON "Option"("nom", "promo");

CREATE TABLE "UserOption" (
    "userId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,

    CONSTRAINT "UserOption_pkey" PRIMARY KEY ("userId", "optionId")
);

CREATE INDEX "UserOption_optionId_idx" ON "UserOption"("optionId");

ALTER TABLE "UserOption" ADD CONSTRAINT "UserOption_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserOption" ADD CONSTRAINT "UserOption_optionId_fkey"
    FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Devoir" ADD COLUMN "optionId" INTEGER;

CREATE INDEX "Devoir_optionId_idx" ON "Devoir"("optionId");

ALTER TABLE "Devoir" ADD CONSTRAINT "Devoir_optionId_fkey"
    FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE CASCADE ON UPDATE CASCADE;
