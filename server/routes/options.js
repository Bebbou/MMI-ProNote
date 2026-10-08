import { Router } from "express";
import prisma from "../db.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

// Options transversales aux groupes (issue #51) : "Anglais renforcé", "Espagnol"...
// Chaque élève choisit les siennes dans son profil ; un devoir peut ensuite cibler une option.
const router = Router();
router.use(requireAuth);

// Les sockets de l'utilisateur rejoignent/quittent la room de l'option tout de suite,
// sans attendre une reconnexion, pour que le temps réel suive son choix
function suivreOption(io, userId, optionId, rejoint) {
  const sockets = io.in(`user-${userId}`);
  if (rejoint) sockets.socketsJoin(`option-${optionId}`);
  else sockets.socketsLeave(`option-${optionId}`);
}

// GET /options — options de MA promo, avec si j'en fais partie et combien de membres
router.get("/", async (req, res) => {
  const options = await prisma.option.findMany({
    where: { promo: req.user.promo },
    orderBy: { nom: "asc" },
    include: {
      _count: { select: { membres: true } },
      membres: { where: { userId: req.user.id }, select: { userId: true } },
    },
  });
  res.json(
    options.map((o) => ({
      id: o.id,
      nom: o.nom,
      promo: o.promo,
      nbMembres: o._count.membres,
      membre: o.membres.length > 0,
    }))
  );
});

// Charge une option de la promo de l'utilisateur (404 sinon : on ne révèle pas les autres promos)
async function optionDeMaPromo(req, res) {
  const option = await prisma.option.findUnique({ where: { id: Number(req.params.id) } });
  if (!option || option.promo !== req.user.promo) {
    res.status(404).json({ error: "Option introuvable." });
    return null;
  }
  return option;
}

// PUT /options/:id/adhesion — je rejoins l'option
router.put("/:id/adhesion", async (req, res) => {
  const option = await optionDeMaPromo(req, res);
  if (!option) return;

  await prisma.userOption.upsert({
    where: { userId_optionId: { userId: req.user.id, optionId: option.id } },
    update: {},
    create: { userId: req.user.id, optionId: option.id },
  });
  suivreOption(req.io, req.user.id, option.id, true);
  res.json({ membre: true });
});

// DELETE /options/:id/adhesion — je quitte l'option
router.delete("/:id/adhesion", async (req, res) => {
  const option = await optionDeMaPromo(req, res);
  if (!option) return;

  await prisma.userOption.deleteMany({ where: { userId: req.user.id, optionId: option.id } });
  suivreOption(req.io, req.user.id, option.id, false);
  res.json({ membre: false });
});

// POST /options — crée une option (admin). Promo : celle de l'admin, sauf si précisée.
router.post("/", requireRole("admin"), async (req, res) => {
  const nom = req.body.nom?.trim();
  if (!nom) return res.status(400).json({ error: "Nom requis." });
  if (nom.length > 60) return res.status(400).json({ error: "Nom trop long (60 max)." });

  const promo = req.body.promo ?? req.user.promo;
  const promoExiste = await prisma.groupe.findFirst({ where: { promo }, select: { id: true } });
  if (!promoExiste) return res.status(400).json({ error: "Promo inconnue." });

  const existante = await prisma.option.findUnique({ where: { nom_promo: { nom, promo } } });
  if (existante) return res.status(400).json({ error: "Cette option existe déjà." });

  const option = await prisma.option.create({ data: { nom, promo } });
  res.status(201).json({ id: option.id, nom: option.nom, promo: option.promo, nbMembres: 0, membre: false });
});

// DELETE /options/:id — supprime une option (admin) ainsi que ses devoirs (cascade)
router.delete("/:id", requireRole("admin"), async (req, res) => {
  const option = await optionDeMaPromo(req, res);
  if (!option) return;

  const devoirs = await prisma.devoir.findMany({ where: { optionId: option.id }, select: { id: true } });
  await prisma.option.delete({ where: { id: option.id } });

  // Les clients qui affichaient ces devoirs les retirent
  for (const { id } of devoirs) {
    req.io.to([`option-${option.id}`, `gestion-${option.promo}`]).emit("devoirSupprime", { id });
  }
  req.io.in(`option-${option.id}`).socketsLeave(`option-${option.id}`);

  res.json({ message: "Option supprimée.", devoirsSupprimes: devoirs.length });
});

export default router;
