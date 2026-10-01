import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import { compteRequetes, lireStats, reinitialiserStats } from "../utils/stats.js";

// Simule le cycle d'une requête : le middleware s'abonne à "finish", on l'émet ensuite
function requete({ method = "GET", path = "/devoirs", statusCode = 200 } = {}) {
  const req = { method, path };
  const res = Object.assign(new EventEmitter(), { statusCode });
  compteRequetes(req, res, () => {});
  res.emit("finish");
}

describe("compteur de requêtes", () => {
  beforeEach(() => {
    reinitialiserStats();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("compte les requêtes et sépare les erreurs 5xx", () => {
    requete();
    requete({ path: "/notes" });
    requete({ path: "/chat", statusCode: 500 });
    requete({ path: "/auth/login", statusCode: 401 }); // une 4xx n'est pas une erreur serveur

    const stats = lireStats(null);
    expect(stats.requests).toBe(4);
    expect(stats.errors).toBe(1);
    expect(stats.total).toBe(4);
  });

  it("ignore l'accueil, /stats et les requêtes OPTIONS", () => {
    requete({ path: "/" });
    requete({ path: "/stats" });
    requete({ method: "OPTIONS", path: "/devoirs" });

    expect(lireStats(null).requests).toBe(0);
  });

  it("oublie les requêtes de plus de 24 h mais garde le total", () => {
    requete();
    vi.setSystemTime(new Date("2026-10-02T13:00:00Z")); // 25 h plus tard
    requete();

    const stats = lireStats(null);
    expect(stats.requests).toBe(1);
    expect(stats.total).toBe(2);
  });

  it("expose le nombre d'utilisateurs connectés en temps réel", () => {
    expect(lireStats({ engine: { clientsCount: 7 } }).sockets).toBe(7);
    expect(lireStats(null).sockets).toBe(0);
  });
});
