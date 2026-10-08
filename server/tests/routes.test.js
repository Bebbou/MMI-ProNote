import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";

// Tests de bout en bout des règles d'accès : vrai serveur Express, vrai middleware
// d'authentification, vraies routes. Seule la base de données est simulée.
vi.mock("../db.js", () => ({
  default: {
    user: { findUnique: vi.fn() },
    groupe: { findFirst: vi.fn(), findUnique: vi.fn() },
    option: { findUnique: vi.fn() },
    userOption: { findMany: vi.fn() },
    document: { findMany: vi.fn(), findUnique: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
    commentaireDoc: { findMany: vi.fn() },
    devoir: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    commentaireDevoir: { findMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("../utils/notifier.js", () => ({ notifierSansBloquer: vi.fn(), ciblesDevoir: vi.fn() }));

import prisma from "../db.js";
import documentsRoutes from "../routes/documents.js";
import devoirsRoutes from "../routes/devoirs.js";

process.env.JWT_SECRET = "secret-de-test";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.io = { to: () => ({ emit: () => {} }) }; // Socket.IO simulé
  next();
});
app.use("/documents", documentsRoutes);
app.use("/devoirs", devoirsRoutes);
app.use((err, req, res, next) => res.status(500).json({ error: err.message })); // eslint-disable-line no-unused-vars

// Connecte un utilisateur : le middleware recharge son rôle et son groupe depuis la base
function connecte({ id = 1, role = "etudiant", groupeId = 10, promo = "MMI2" } = {}) {
  prisma.user.findUnique.mockResolvedValue({ id, role, groupeId, valide: true, groupe: { promo } });
  const token = jwt.sign({ id }, process.env.JWT_SECRET);
  return { Authorization: `Bearer ${token}` };
}

const unDevoir = (extra = {}) => ({
  id: 5,
  groupeId: 10,
  optionId: null,
  promoCible: null,
  auteurId: 2,
  type: "Devoir",
  dateLimite: new Date("2026-12-01T10:00:00Z"),
  auteur: { role: "delegue" },
  option: null,
  groupe: { promo: "MMI2" },
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.userOption.findMany.mockResolvedValue([]);
});

describe("cours : cloisonnement par promo (issue #49)", () => {
  it("un élève ne liste que les cours de sa promo", async () => {
    prisma.document.findMany.mockResolvedValue([]);
    await request(app)
      .get("/documents")
      .set(connecte({ promo: "MMI2" }))
      .expect(200);
    expect(prisma.document.findMany.mock.calls[0][0].where).toEqual({ OR: [{ promo: "MMI2" }] });
  });

  it("un admin liste toutes les promos", async () => {
    prisma.document.findMany.mockResolvedValue([]);
    await request(app)
      .get("/documents")
      .set(connecte({ role: "admin" }))
      .expect(200);
    expect(prisma.document.findMany.mock.calls[0][0].where).toEqual({});
  });

  it("télécharger le cours d'une autre promo répond 404 (on ne révèle pas son existence)", async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 9, promo: "MMI3", auteurId: 99, fileName: "a.pdf" });
    await request(app)
      .get("/documents/9/download")
      .set(connecte({ promo: "MMI2" }))
      .expect(404);
  });

  it("un élève ne peut pas publier de cours", async () => {
    await request(app).post("/documents").set(connecte()).expect(403);
  });

  it("un professeur ne peut pas modifier le cours d'un autre", async () => {
    prisma.document.findUnique.mockResolvedValue({ id: 9, promo: "MMI2", auteurId: 99 });
    await request(app)
      .patch("/documents/9")
      .set(connecte({ id: 7, role: "professeur" }))
      .send({ titre: "Autre titre" })
      .expect(403);
  });

  it("refuse un nouveau cours quand le stockage est plein", async () => {
    prisma.document.aggregate.mockResolvedValue({ _sum: { fileSize: 400 * 1024 * 1024 } });
    await request(app)
      .post("/documents")
      .set(connecte({ id: 7, role: "professeur" }))
      .field("titre", "Cours")
      .field("matiere", "Web")
      .attach("file", Buffer.from("%PDF-1.1"), { filename: "a.pdf", contentType: "application/pdf" })
      .expect(507);
    expect(prisma.document.create).not.toHaveBeenCalled();
  });
});

describe("devoirs : visibilité et droits (issues #51 et #25)", () => {
  it("la liste inclut le groupe, la promo et les options de l'élève", async () => {
    prisma.userOption.findMany.mockResolvedValue([{ optionId: 5 }]);
    prisma.devoir.findMany.mockResolvedValue([]);
    await request(app).get("/devoirs").set(connecte()).expect(200);

    const { OR } = prisma.devoir.findMany.mock.calls[0][0].where;
    expect(OR).toContainEqual({ optionId: null, promoCible: null, groupeId: 10 });
    expect(OR).toContainEqual({ optionId: null, promoCible: "MMI2" });
    expect(OR).toContainEqual({ optionId: { in: [5] } });
  });

  it("un délégué ne peut pas cibler toute une promo", async () => {
    await request(app)
      .post("/devoirs")
      .set(connecte({ id: 2, role: "delegue" }))
      .send({ titre: "T", matiere: "M", dateLimite: "2026-12-01T10:00:00Z", cible: "promo:MMI2" })
      .expect(400);
    expect(prisma.devoir.create).not.toHaveBeenCalled();
  });

  it("un délégué ne peut pas modifier le devoir d'un professeur", async () => {
    prisma.devoir.findUnique.mockResolvedValue(
      unDevoir({ promoCible: "MMI2", auteurId: 7, auteur: { role: "professeur" } })
    );
    await request(app)
      .patch("/devoirs/5")
      .set(connecte({ id: 2, role: "delegue" }))
      .send({ titre: "T", matiere: "M", dateLimite: "2026-12-01T10:00:00Z" })
      .expect(403);
    expect(prisma.devoir.update).not.toHaveBeenCalled();
  });

  it("un élève ne peut ni créer ni modifier de devoir", async () => {
    await request(app).post("/devoirs").set(connecte()).send({}).expect(403);
    await request(app).patch("/devoirs/5").set(connecte()).send({}).expect(403);
  });

  it("un élève d'un autre groupe ne peut pas commenter un devoir qu'il ne voit pas", async () => {
    prisma.devoir.findUnique.mockResolvedValue(unDevoir({ groupeId: 10 }));
    await request(app)
      .post("/devoirs/5/commentaires")
      .set(connecte({ groupeId: 11 }))
      .send({ content: "salut" })
      .expect(403);
    expect(prisma.commentaireDevoir.create).not.toHaveBeenCalled();
  });

  it("un élève qui n'est pas dans l'option ne voit pas son devoir, même dans son groupe", async () => {
    prisma.devoir.findUnique.mockResolvedValue(
      unDevoir({ groupeId: 10, optionId: 5, option: { promo: "MMI2" } })
    );
    await request(app)
      .get("/devoirs/5/commentaires")
      .set(connecte({ groupeId: 10 }))
      .expect(403);
  });

  it("un membre de l'option voit son devoir même depuis un autre groupe", async () => {
    prisma.devoir.findUnique.mockResolvedValue(
      unDevoir({ groupeId: 12, optionId: 5, option: { promo: "MMI2" } })
    );
    prisma.userOption.findMany.mockResolvedValue([{ optionId: 5 }]);
    prisma.commentaireDevoir.findMany.mockResolvedValue([]);
    await request(app)
      .get("/devoirs/5/commentaires")
      .set(connecte({ groupeId: 10 }))
      .expect(200);
  });
});
