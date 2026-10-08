import { describe, it, expect } from "vitest";
import { peutVoirDocument, peutGererDocument } from "../utils/documentAccess.js";

const eleve = { id: 1, role: "etudiant", promo: "MMI2" };
const prof = { id: 7, role: "professeur", promo: "MMI2" };
const admin = { id: 2, role: "admin", promo: "MMI2" };

const coursMMI2 = { promo: "MMI2", auteurId: 99 };
const coursMMI3 = { promo: "MMI3", auteurId: 99 };
const coursDuProfMMI3 = { promo: "MMI3", auteurId: 7 };

describe("peutVoirDocument", () => {
  it("un élève ne voit que les cours de sa promo", () => {
    expect(peutVoirDocument(eleve, coursMMI2)).toBe(true);
    expect(peutVoirDocument(eleve, coursMMI3)).toBe(false);
  });

  it("un professeur voit les cours de sa promo et les siens, même pour une autre promo", () => {
    expect(peutVoirDocument(prof, coursMMI2)).toBe(true);
    expect(peutVoirDocument(prof, coursDuProfMMI3)).toBe(true);
    expect(peutVoirDocument(prof, coursMMI3)).toBe(false);
  });

  it("un élève ne voit pas un cours d'une autre promo même s'il porte le même identifiant d'auteur", () => {
    expect(peutVoirDocument({ ...eleve, id: 7 }, coursDuProfMMI3)).toBe(false);
  });

  it("un admin voit tout", () => {
    expect(peutVoirDocument(admin, coursMMI3)).toBe(true);
  });
});

describe("peutGererDocument", () => {
  it("un professeur ne gère que ses propres cours", () => {
    expect(peutGererDocument(prof, coursDuProfMMI3)).toBe(true);
    expect(peutGererDocument(prof, coursMMI2)).toBe(false);
  });

  it("un élève ne gère rien", () => {
    expect(peutGererDocument(eleve, coursMMI2)).toBe(false);
  });

  it("un admin gère tout", () => {
    expect(peutGererDocument(admin, coursMMI2)).toBe(true);
  });
});
