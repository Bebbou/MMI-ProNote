-- Rappel automatique "à rendre sous 24h" : un seul rappel par devoir.

ALTER TABLE "Devoir" ADD COLUMN "rappelEnvoye" BOOLEAN NOT NULL DEFAULT false;
