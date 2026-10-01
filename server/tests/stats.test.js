import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import {
  compteRequetes,
  lireStats,
  reinitialiserStats,
  fluxEvenements,
  signalerConnexion,
} from "../utils/stats.js";

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

describe("flux en direct (SSE)", () => {
  beforeEach(() => {
    reinitialiserStats();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  // Abonne un faux client au flux et retourne de quoi l'observer
  function abonne() {
    const req = new EventEmitter();
    const res = { set: vi.fn(), flushHeaders: vi.fn(), write: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    fluxEvenements(req, res);
    const messages = () => res.write.mock.calls.map(([texte]) => texte);
    return { req, res, messages };
  }

  it("ouvre un flux text/event-stream sans compression", () => {
    const { res } = abonne();
    const entetes = res.set.mock.calls[0][0];
    expect(entetes["Content-Type"]).toBe("text/event-stream");
    expect(entetes["Cache-Control"]).toContain("no-transform");
    expect(res.flushHeaders).toHaveBeenCalled();
  });

  it("regroupe les requêtes d'un même instant en un seul message", () => {
    const { messages } = abonne();
    requete();
    requete();
    requete();
    vi.advanceTimersByTime(150);

    const donnees = messages().filter((m) => m.startsWith("data:"));
    expect(donnees).toHaveLength(1);
    expect(JSON.parse(donnees[0].slice(5))).toEqual({ type: "requete", n: 3 });
  });

  it("signale une connexion temps réel à part des requêtes", () => {
    const { messages } = abonne();
    signalerConnexion();
    vi.advanceTimersByTime(150);

    const donnees = messages().filter((m) => m.startsWith("data:"));
    expect(JSON.parse(donnees[0].slice(5))).toEqual({ type: "connexion", n: 1 });
  });

  it("n'envoie rien quand le client s'est déconnecté", () => {
    const { req, messages } = abonne();
    req.emit("close");
    requete();
    vi.advanceTimersByTime(150);

    expect(messages().filter((m) => m.startsWith("data:"))).toHaveLength(0);
  });

  it("ne diffuse rien (et ne crée aucun minuteur) quand personne n'écoute", () => {
    requete();
    expect(vi.getTimerCount()).toBe(0);
  });
});
