-- CreateTable
CREATE TABLE "Groupe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'etudiant',
    "valide" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupeId" INTEGER NOT NULL,
    CONSTRAINT "User_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Devoir" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titre" TEXT NOT NULL,
    "matiere" TEXT NOT NULL,
    "description" TEXT,
    "dateLimite" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupeId" INTEGER NOT NULL,
    "auteurId" INTEGER NOT NULL,
    CONSTRAINT "Devoir_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Devoir_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matiere" TEXT NOT NULL,
    "valeur" REAL NOT NULL,
    "coefficient" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cours" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matiere" TEXT NOT NULL,
    "jour" TEXT NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "salle" TEXT,
    "prof" TEXT,
    "groupeId" INTEGER NOT NULL,
    CONSTRAINT "Cours_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Groupe_nom_key" ON "Groupe"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
