import { describe, it, expect, vi } from "vitest";

// Mock de Prisma : aucune vraie base de données n'est utilisée
vi.mock("../db.js", () => ({ default: {} }));

import { filtreDevoirsVisibles, devoirEstVisible, roomsDevoir } from "../utils/devoirAccess.js";

const eleveA1 = { id: 1, role: "etudiant", groupeId: 10, promo: "MMI2" };
const delegueA1 = { id: 2, role: "delegue", groupeId: 10, promo: "MMI2" };
const delegueAutrePromo = { id: 3, role: "delegue", groupeId: 99, promo: "MMI3" };

const devoirGroupe = { groupeId: 10, optionId: null };
const devoirAutreGroupe = { groupeId: 11, optionId: null };
const devoirAnglais = { groupeId: 11, optionId: 5, option: { promo: "MMI2" } };

describe("devoirEstVisible", () => {
  it("un devoir sans option n'est visible que par son groupe", () => {
    expect(devoirEstVisible(eleveA1, [], devoirGroupe)).toBe(true);
    expect(devoirEstVisible(eleveA1, [], devoirAutreGroupe)).toBe(false);
  });

  it("un devoir d'option est visible par ses membres, même d'un autre groupe", () => {
    expect(devoirEstVisible(eleveA1, [5], devoirAnglais)).toBe(true);
  });

  it("un devoir d'option est caché aux élèves qui n'en font pas partie, même du même groupe", () => {
    const devoirDuGroupeEnAnglais = { groupeId: 10, optionId: 5, option: { promo: "MMI2" } };
    expect(devoirEstVisible(eleveA1, [], devoirDuGroupeEnAnglais)).toBe(false);
    expect(devoirEstVisible(eleveA1, [6], devoirDuGroupeEnAnglais)).toBe(false);
  });

  it("les délégués voient les options de leur promo pour pouvoir les gérer", () => {
    expect(devoirEstVisible(delegueA1, [], devoirAnglais)).toBe(true);
  });

  it("mais pas celles d'une autre promo", () => {
    expect(devoirEstVisible(delegueAutrePromo, [], devoirAnglais)).toBe(false);
  });
});

describe("filtreDevoirsVisibles", () => {
  it("un élève : son groupe sans option + ses options", () => {
    expect(filtreDevoirsVisibles(eleveA1, [5])).toEqual({
      OR: [{ optionId: null, groupeId: 10 }, { optionId: { in: [5] } }],
    });
  });

  it("un gestionnaire : en plus, toutes les options de sa promo", () => {
    const { OR } = filtreDevoirsVisibles(delegueA1, []);
    expect(OR).toContainEqual({ option: { promo: "MMI2" } });
  });
});

describe("roomsDevoir", () => {
  it("devoir de groupe : la room du groupe", () => {
    expect(roomsDevoir(devoirGroupe)).toEqual(["groupe-10"]);
  });

  it("devoir d'option : les membres et les gestionnaires de la promo, pas le groupe", () => {
    expect(roomsDevoir(devoirAnglais)).toEqual(["option-5", "gestion-MMI2"]);
  });
});
