import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock de Prisma et du push : aucune vraie base ni notification
vi.mock("../db.js", () => ({
  default: {
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
  },
}));
vi.mock("../utils/push.js", () => ({ sendPushToUsers: vi.fn() }));

import prisma from "../db.js";
import { sendPushToUsers } from "../utils/push.js";
import { notifier, ciblesDevoir, PREFS } from "../utils/notifier.js";

const payload = { title: "Nouveau devoir · Web", body: "Maquette", url: "/devoirs", tag: "devoir-1" };

beforeEach(() => vi.clearAllMocks());

describe("ciblesDevoir", () => {
  it("un devoir d'option cible ses membres", () => {
    expect(ciblesDevoir({ optionId: 5, groupeId: 10 })).toEqual({ options: { some: { optionId: 5 } } });
  });

  it("un devoir de promo cible toute la promo", () => {
    expect(ciblesDevoir({ optionId: null, promoCible: "MMI2", groupeId: 10 })).toEqual({
      groupe: { promo: "MMI2" },
    });
  });

  it("un devoir de groupe cible son groupe", () => {
    expect(ciblesDevoir({ optionId: null, promoCible: null, groupeId: 10 })).toEqual({ groupeId: 10 });
  });
});

describe("notifier", () => {
  it("ne retient que les comptes validés qui n'ont pas désactivé la catégorie, sans l'auteur", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await notifier({ where: { groupeId: 10 }, categorie: "devoir", payload, exclureUserId: 7 });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { groupeId: 10, valide: true, notifDevoirs: true, id: { not: 7 } },
      select: { id: true },
    });
  });

  it("chaque catégorie lit sa propre préférence", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    for (const [categorie, colonne] of Object.entries(PREFS)) {
      await notifier({ where: {}, categorie, payload });
      expect(prisma.user.findMany.mock.calls.at(-1)[0].where[colonne]).toBe(true);
    }
  });

  it("écrit l'historique de la cloche pour chaque destinataire puis envoie le push", async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const n = await notifier({ where: { groupeId: 10 }, categorie: "devoir", payload });

    expect(n).toBe(2);
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 1, categorie: "devoir", titre: payload.title, corps: payload.body, url: "/devoirs" },
        { userId: 2, categorie: "devoir", titre: payload.title, corps: payload.body, url: "/devoirs" },
      ],
    });
    expect(sendPushToUsers).toHaveBeenCalledWith([1, 2], payload);
  });

  it("sans destinataire, n'écrit ni n'envoie rien", async () => {
    prisma.user.findMany.mockResolvedValue([]);
    expect(await notifier({ where: {}, categorie: "cours", payload })).toBe(0);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(sendPushToUsers).not.toHaveBeenCalled();
  });

  it("refuse une catégorie inconnue", async () => {
    await expect(notifier({ where: {}, categorie: "spam", payload })).rejects.toThrow(/inconnue/);
  });
});
