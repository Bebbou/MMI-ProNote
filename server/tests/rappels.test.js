import { describe, it, expect, vi } from "vitest";

// Mock de Prisma et de l'envoi : aucune vraie base ni notification
vi.mock("../db.js", () => ({ default: {} }));
vi.mock("../utils/notifier.js", () => ({ notifier: vi.fn(), ciblesDevoir: vi.fn() }));

import { dansLaFenetre, quandLibelle, payloadRappel } from "../services/rappels.js";

// 8 oct. 2026 14:00 heure de Paris (UTC+2) = 12:00 UTC
const now = new Date("2026-10-08T12:00:00Z");

describe("dansLaFenetre", () => {
  it("vrai si l'échéance est dans moins de 24h", () => {
    expect(dansLaFenetre("2026-10-09T07:30:00Z", now)).toBe(true);
  });

  it("faux au-delà de 24h", () => {
    expect(dansLaFenetre("2026-10-09T12:00:01Z", now)).toBe(false);
  });

  it("faux si l'échéance est déjà passée", () => {
    expect(dansLaFenetre("2026-10-08T11:59:00Z", now)).toBe(false);
  });
});

describe("quandLibelle", () => {
  it("dit 'demain' avec l'heure française, pas l'heure UTC du serveur", () => {
    expect(quandLibelle("2026-10-09T07:30:00Z", now)).toBe("demain à 09:30");
  });

  it("dit 'aujourd'hui' pour une échéance le soir même", () => {
    expect(quandLibelle("2026-10-08T21:00:00Z", now)).toBe("aujourd'hui à 23:00");
  });

  it("compte le jour à la française : 23h30 à Paris reste le même jour même si c'est le lendemain en UTC", () => {
    // 22:30 UTC le 8 = 00:30 le 9 à Paris -> demain
    expect(quandLibelle("2026-10-08T22:30:00Z", now)).toBe("demain à 00:30");
  });
});

describe("payloadRappel", () => {
  it("distingue une évaluation d'un devoir et pointe vers la page Devoirs", () => {
    const p = payloadRappel(
      { id: 4, titre: "QCM Phaser", matiere: "R312", type: "Evaluation", dateLimite: "2026-10-09T07:30:00Z" },
      now
    );
    expect(p.title).toBe("Rappel · R312");
    expect(p.body).toBe("Évaluation « QCM Phaser » : à rendre demain à 09:30");
    expect(p.url).toBe("/devoirs");
    expect(p.tag).toBe("rappel-4");
  });
});
