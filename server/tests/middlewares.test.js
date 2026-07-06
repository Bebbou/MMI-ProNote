import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

// Mock de Prisma : aucune vraie base de données n'est utilisée
vi.mock("../db.js", () => ({
  default: {
    user: { findUnique: vi.fn() },
  },
}));

import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

process.env.JWT_SECRET = "secret-de-test";

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("requireAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse une requête sans token", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("refuse un token invalide", async () => {
    const req = { headers: { authorization: "Bearer n-importe-quoi" } };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepte un token valide et recharge le rôle depuis la base", async () => {
    const token = jwt.sign({ id: 1, role: "etudiant", groupeId: 1 }, process.env.JWT_SECRET);
    // En base, l'utilisateur est devenu délégué depuis l'émission du token
    prisma.user.findUnique.mockResolvedValue({ id: 1, role: "delegue", groupeId: 2, valide: true });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    // C'est bien le rôle de la BASE qui fait foi, pas celui du token
    expect(req.user).toEqual({ id: 1, role: "delegue", groupeId: 2 });
  });

  it("refuse un compte supprimé même avec un token valide", async () => {
    const token = jwt.sign({ id: 99, role: "admin", groupeId: 1 }, process.env.JWT_SECRET);
    prisma.user.findUnique.mockResolvedValue(null);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("refuse un compte non validé", async () => {
    const token = jwt.sign({ id: 5, role: "etudiant", groupeId: 1 }, process.env.JWT_SECRET);
    prisma.user.findUnique.mockResolvedValue({ id: 5, role: "etudiant", groupeId: 1, valide: false });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("requireRole", () => {
  it("laisse passer un rôle autorisé", () => {
    const req = { user: { role: "delegue" } };
    const res = mockRes();
    const next = vi.fn();

    requireRole("admin", "delegue")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("bloque un rôle non autorisé", () => {
    const req = { user: { role: "etudiant" } };
    const res = mockRes();
    const next = vi.fn();

    requireRole("admin", "delegue")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
