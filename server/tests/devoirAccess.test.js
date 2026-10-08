import { describe, it, expect, vi } from "vitest";

// Mock de Prisma : aucune vraie base de données n'est utilisée
vi.mock("../db.js", () => ({ default: {} }));

import {
  filtreDevoirsVisibles,
  devoirEstVisible,
  peutGererDevoir,
  roomsDevoir,
} from "../utils/devoirAccess.js";

const eleveA1 = { id: 1, role: "etudiant", groupeId: 10, promo: "MMI2" };
const delegueA1 = { id: 2, role: "delegue", groupeId: 10, promo: "MMI2" };
const delegueAutrePromo = { id: 3, role: "delegue", groupeId: 99, promo: "MMI3" };
const prof = { id: 7, role: "professeur", groupeId: 10, promo: "MMI2" };
const admin = { id: 8, role: "admin", groupeId: 10, promo: "MMI2" };

const devoirGroupe = { groupeId: 10, optionId: null, promoCible: null, auteurId: 2 };
const devoirAutreGroupe = { groupeId: 11, optionId: null, promoCible: null, auteurId: 2 };
const devoirAnglais = { groupeId: 11, optionId: 5, promoCible: null, auteurId: 2, option: { promo: "MMI2" } };
const devoirPromo = { groupeId: 10, optionId: null, promoCible: "MMI2", auteurId: 7 };
const devoirProfAutrePromo = { groupeId: 50, optionId: null, promoCible: "MMI3", auteurId: 7 };

describe("devoirEstVisible", () => {
  it("un devoir de groupe n'est visible que par son groupe", () => {
    expect(devoirEstVisible(eleveA1, [], devoirGroupe)).toBe(true);
    expect(devoirEstVisible(eleveA1, [], devoirAutreGroupe)).toBe(false);
  });

  it("un devoir d'option est visible par ses membres, même d'un autre groupe", () => {
    expect(devoirEstVisible(eleveA1, [5], devoirAnglais)).toBe(true);
  });

  it("un devoir d'option est caché aux élèves qui n'en font pas partie, même du même groupe", () => {
    const dansLeGroupe = { ...devoirAnglais, groupeId: 10 };
    expect(devoirEstVisible(eleveA1, [], dansLeGroupe)).toBe(false);
    expect(devoirEstVisible(eleveA1, [6], dansLeGroupe)).toBe(false);
  });

  it("les délégués voient les options de leur promo pour pouvoir les gérer", () => {
    expect(devoirEstVisible(delegueA1, [], devoirAnglais)).toBe(true);
    expect(devoirEstVisible(delegueAutrePromo, [], devoirAnglais)).toBe(false);
  });

  it("un devoir de promo est visible par toute la promo, quel que soit le groupe", () => {
    expect(devoirEstVisible({ ...eleveA1, groupeId: 12 }, [], devoirPromo)).toBe(true);
    expect(devoirEstVisible(delegueAutrePromo, [], devoirPromo)).toBe(false);
  });

  it("un professeur ou un admin voit toujours ses propres devoirs, même pour une autre promo", () => {
    expect(devoirEstVisible(prof, [], devoirProfAutrePromo)).toBe(true);
    expect(devoirEstVisible({ ...admin, id: 7 }, [], devoirProfAutrePromo)).toBe(true);
  });

  it("un élève ne voit pas un devoir dont l'identifiant d'auteur est le sien par hasard", () => {
    expect(devoirEstVisible({ ...eleveA1, id: 7 }, [], devoirProfAutrePromo)).toBe(false);
  });
});

describe("peutGererDevoir", () => {
  const devoirDuProf = { auteurId: 7, auteur: { role: "professeur" } };
  const devoirDuDelegue = { auteurId: 2, auteur: { role: "delegue" } };

  it("un admin gère tout", () => {
    expect(peutGererDevoir(admin, devoirDuProf)).toBe(true);
  });

  it("un professeur ne gère que les siens", () => {
    expect(peutGererDevoir(prof, devoirDuProf)).toBe(true);
    expect(peutGererDevoir(prof, devoirDuDelegue)).toBe(false);
  });

  it("un délégué gère les devoirs visibles, sauf ceux d'un professeur", () => {
    expect(peutGererDevoir(delegueA1, devoirDuDelegue)).toBe(true);
    expect(peutGererDevoir(delegueA1, devoirDuProf)).toBe(false);
  });

  it("un élève ne gère rien", () => {
    expect(peutGererDevoir(eleveA1, devoirDuDelegue)).toBe(false);
  });
});

describe("filtreDevoirsVisibles", () => {
  it("un élève : son groupe, sa promo et ses options", () => {
    expect(filtreDevoirsVisibles(eleveA1, [5])).toEqual({
      OR: [
        { optionId: null, promoCible: null, groupeId: 10 },
        { optionId: null, promoCible: "MMI2" },
        { optionId: { in: [5] } },
      ],
    });
  });

  it("un gestionnaire : en plus, toutes les options de sa promo", () => {
    const { OR } = filtreDevoirsVisibles(delegueA1, []);
    expect(OR).toContainEqual({ option: { promo: "MMI2" } });
  });

  it("un professeur : en plus, ses propres devoirs", () => {
    const { OR } = filtreDevoirsVisibles(prof, []);
    expect(OR).toContainEqual({ auteurId: 7 });
  });
});

describe("roomsDevoir", () => {
  it("devoir de groupe : le groupe et l'auteur", () => {
    expect(roomsDevoir(devoirGroupe)).toEqual(["groupe-10", "user-2"]);
  });

  it("devoir de promo : la promo et l'auteur", () => {
    expect(roomsDevoir(devoirPromo)).toEqual(["promo-MMI2", "user-7"]);
  });

  it("devoir d'option : membres, gestionnaires de la promo et auteur", () => {
    expect(roomsDevoir(devoirAnglais)).toEqual(["option-5", "gestion-MMI2", "user-2"]);
  });
});
