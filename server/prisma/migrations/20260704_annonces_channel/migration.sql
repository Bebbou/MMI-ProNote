INSERT INTO "Channel" ("nom", "description", "type")
VALUES ('Annonces', 'Annonces officielles — lecture seule pour les étudiants', 'annonce')
ON CONFLICT ("nom") DO UPDATE SET "type" = 'annonce';
