import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "secret-de-test";

// Mock de Prisma : aucune vraie base de données n'est utilisée
vi.mock("../db.js", () => ({
  default: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    groupe: { findUnique: vi.fn() },
    passwordReset: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

import prisma from "../db.js";
import authRoutes from "../routes/auth.js";

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

const GROUPE = { id: 1, nom: "TPA1" };

describe("POST /auth/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse si des champs manquent", async () => {
    const res = await request(app).post("/auth/register").send({ email: "a@b.c" });
    expect(res.status).toBe(400);
  });

  it("refuse un mot de passe trop court", async () => {
    const res = await request(app).post("/auth/register").send({
      nom: "Test",
      email: "a@b.c",
      password: "123",
      groupeNom: "TPA1",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 caractères/);
  });

  it("refuse un groupe inexistant", async () => {
    prisma.groupe.findUnique.mockResolvedValue(null);
    const res = await request(app).post("/auth/register").send({
      nom: "Test",
      email: "a@b.c",
      password: "motdepasse",
      groupeNom: "FAUX",
    });
    expect(res.status).toBe(400);
  });

  it("refuse un email déjà utilisé", async () => {
    prisma.groupe.findUnique.mockResolvedValue(GROUPE);
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: "a@b.c" });
    const res = await request(app).post("/auth/register").send({
      nom: "Test",
      email: "a@b.c",
      password: "motdepasse",
      groupeNom: "TPA1",
    });
    expect(res.status).toBe(400);
  });

  it("crée le compte (non validé) si tout est bon", async () => {
    prisma.groupe.findUnique.mockResolvedValue(GROUPE);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 42 });

    const res = await request(app).post("/auth/register").send({
      nom: "Test",
      email: "nouveau@b.c",
      password: "motdepasse",
      groupeNom: "TPA1",
    });

    expect(res.status).toBe(201);
    // Le mot de passe doit être hashé, jamais stocké en clair
    const dataPassword = prisma.user.create.mock.calls[0][0].data.password;
    expect(dataPassword).not.toBe("motdepasse");
    expect(dataPassword.startsWith("$2")).toBe(true); // format bcrypt
  });
});

describe("POST /auth/login", () => {
  beforeEach(() => vi.clearAllMocks());

  const USER = {
    id: 1,
    nom: "Lino",
    email: "lino@test.fr",
    password: bcrypt.hashSync("bonmotdepasse", 10),
    role: "etudiant",
    groupeId: 1,
    valide: true,
    groupe: GROUPE,
  };

  it("refuse un email inconnu", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app).post("/auth/login").send({ email: "inconnu@x.fr", password: "x" });
    expect(res.status).toBe(401);
  });

  it("refuse un compte non validé", async () => {
    prisma.user.findUnique.mockResolvedValue({ ...USER, valide: false });
    const res = await request(app).post("/auth/login").send({ email: USER.email, password: "bonmotdepasse" });
    expect(res.status).toBe(403);
  });

  it("refuse un mauvais mot de passe", async () => {
    prisma.user.findUnique.mockResolvedValue(USER);
    const res = await request(app).post("/auth/login").send({ email: USER.email, password: "mauvais" });
    expect(res.status).toBe(401);
  });

  it("connecte avec les bons identifiants et renvoie un token valide", async () => {
    prisma.user.findUnique.mockResolvedValue(USER);
    const res = await request(app).post("/auth/login").send({ email: USER.email, password: "bonmotdepasse" });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 1, nom: "Lino", role: "etudiant", groupe: "TPA1" });

    // Le token doit être signé avec notre secret et contenir les bonnes infos
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload.id).toBe(1);
    expect(payload.role).toBe("etudiant");
  });
});

describe("GET /auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse sans token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("renvoie les infos fraîches avec un token valide", async () => {
    const token = jwt.sign({ id: 1, role: "etudiant", groupeId: 1 }, process.env.JWT_SECRET);
    // Premier appel : requireAuth vérifie le compte. Second : la route charge le profil complet.
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 1, role: "delegue", groupeId: 1, valide: true })
      .mockResolvedValueOnce({ id: 1, nom: "Lino", role: "delegue", groupe: GROUPE });

    const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("delegue");
  });
});
