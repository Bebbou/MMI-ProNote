// Vérification de bout en bout sur une VRAIE base : se connecte avec les comptes du seed et
// contrôle ce que chacun voit (cloisonnement par promo, options, devoirs ciblés, droits).
//
// Usage : serveur lancé sur une base semée (npm run db:push && npm run seed), puis
//   cd server && npm run smoke
// BASE_URL pour viser un autre serveur (par défaut http://localhost:3000).

import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MOT_DE_PASSE = "test1234"; // celui de scripts/seed.js

async function appel(chemin, { token, ...options } = {}) {
  const res = await fetch(BASE + chemin, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const corps = await res.json().catch(() => null);
  return { status: res.status, corps };
}

async function connexion(email) {
  const { status, corps } = await appel("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password: MOT_DE_PASSE }),
  });
  assert.equal(status, 200, `connexion de ${email} : statut ${status}`);
  return corps.token;
}

const titres = (liste) => liste.map((d) => d.titre);
let nb = 0;
async function verifier(nom, fn) {
  try {
    await fn();
    nb++;
    console.log(`  ok   ${nom}`);
  } catch (e) {
    console.error(`  ÉCHEC ${nom}\n        ${e.message}`);
    process.exitCode = 1;
  }
}

const racine = await appel("/");
assert.equal(racine.status, 200, `le serveur ne répond pas sur ${BASE}`);

const eleveA1 = await connexion("eleve.a1@test.local"); // TDA1, membre de l'anglais renforcé
const eleveA2 = await connexion("eleve.a2@test.local"); // TDA2, pas dans l'option
const eleveB1 = await connexion("eleve.b1@test.local"); // TDB1, membre de l'anglais renforcé
const eleveMmi3 = await connexion("eleve.mmi3@test.local");
const delegue = await connexion("delegue@test.local");
const prof = await connexion("prof@test.local");

console.log("Devoirs");
await verifier("un membre de l'option voit l'oral d'anglais, même depuis un autre groupe", async () => {
  for (const token of [eleveA1, eleveB1]) {
    const { corps } = await appel("/devoirs", { token });
    assert.ok(titres(corps).includes("Oral en anglais"));
  }
});

await verifier("un élève hors option ne voit pas l'oral d'anglais", async () => {
  const { corps } = await appel("/devoirs", { token: eleveA2 });
  assert.ok(!titres(corps).includes("Oral en anglais"));
});

await verifier("un devoir de groupe n'est vu que par son groupe", async () => {
  const a2 = await appel("/devoirs", { token: eleveA2 });
  const a1 = await appel("/devoirs", { token: eleveA1 });
  assert.ok(titres(a2.corps).includes("Devoir du groupe TDA2 uniquement"));
  assert.ok(!titres(a1.corps).includes("Devoir du groupe TDA2 uniquement"));
});

await verifier(
  "un devoir de promo (créé par un professeur) est vu par tous les groupes de la promo",
  async () => {
    for (const token of [eleveA1, eleveA2, eleveB1]) {
      const { corps } = await appel("/devoirs", { token });
      assert.ok(titres(corps).includes("QCM de fin de ressource"));
    }
  }
);

await verifier("l'autre promo ne voit aucun de ces devoirs", async () => {
  const { corps } = await appel("/devoirs", { token: eleveMmi3 });
  assert.deepEqual(titres(corps), []);
});

await verifier("un professeur crée un devoir pour toute une promo", async () => {
  const { status, corps } = await appel("/devoirs", {
    token: prof,
    method: "POST",
    body: JSON.stringify({
      titre: "Smoke promo",
      matiere: "Web",
      dateLimite: new Date(Date.now() + 864e5 * 9).toISOString(),
      cible: "promo:MMI2",
    }),
  });
  assert.equal(status, 201);
  assert.equal(corps.promoCible, "MMI2");
  const vu = await appel("/devoirs", { token: eleveA2 });
  assert.ok(titres(vu.corps).includes("Smoke promo"));
  await appel(`/devoirs/${corps.id}`, { token: prof, method: "DELETE" });
});

await verifier("un délégué ne peut pas cibler toute une promo", async () => {
  const { status } = await appel("/devoirs", {
    token: delegue,
    method: "POST",
    body: JSON.stringify({
      titre: "x",
      matiere: "x",
      dateLimite: new Date().toISOString(),
      cible: "promo:MMI2",
    }),
  });
  assert.equal(status, 400);
});

await verifier("un élève ne peut pas créer de devoir", async () => {
  const { status } = await appel("/devoirs", { token: eleveA1, method: "POST", body: "{}" });
  assert.equal(status, 403);
});

console.log("Cours");
await verifier("un élève MMI2 ne voit que les cours MMI2", async () => {
  const { corps } = await appel("/documents", { token: eleveA1 });
  const t = corps.map((d) => d.titre);
  assert.ok(t.includes("[TEST] Cours MMI2"));
  assert.ok(!t.includes("[TEST] Cours MMI3"));
});

await verifier("un élève MMI3 ne voit que les cours MMI3", async () => {
  const { corps } = await appel("/documents", { token: eleveMmi3 });
  const t = corps.map((d) => d.titre);
  assert.ok(t.includes("[TEST] Cours MMI3"));
  assert.ok(!t.includes("[TEST] Cours MMI2"));
});

await verifier("télécharger un cours d'une autre promo répond 404", async () => {
  const { corps } = await appel("/documents", { token: prof });
  const mmi3 = corps.find((d) => d.titre === "[TEST] Cours MMI3");
  // le professeur en est l'auteur : il le voit ; l'élève MMI2, non
  const { status } = await appel(`/documents/${mmi3.id}/download`, { token: eleveA1 });
  assert.equal(status, 404);
});

console.log("Notifications");
await verifier("préférences : lecture et modification", async () => {
  const avant = await appel("/notifications/preferences", { token: eleveA1 });
  assert.equal(avant.corps.devoirs, true);
  await appel("/notifications/preferences", {
    token: eleveA1,
    method: "PUT",
    body: JSON.stringify({ rappels: false }),
  });
  const apres = await appel("/notifications/preferences", { token: eleveA1 });
  assert.equal(apres.corps.rappels, false);
  await appel("/notifications/preferences", {
    token: eleveA1,
    method: "PUT",
    body: JSON.stringify({ rappels: true }),
  });
});

await verifier("un devoir créé notifie la cloche des destinataires, pas celle de l'auteur", async () => {
  const { corps } = await appel("/devoirs", {
    token: delegue,
    method: "POST",
    body: JSON.stringify({
      titre: "Smoke cloche",
      matiere: "Web",
      dateLimite: new Date(Date.now() + 864e5 * 9).toISOString(),
    }),
  });
  await new Promise((r) => setTimeout(r, 500)); // la notification s'écrit après la réponse
  const eleve = await appel("/notifications", { token: eleveA1 });
  const auteur = await appel("/notifications", { token: delegue });
  assert.ok(eleve.corps.items.some((n) => n.corps.includes("Smoke cloche")));
  assert.ok(!auteur.corps.items.some((n) => n.corps.includes("Smoke cloche")));
  await appel(`/devoirs/${corps.id}`, { token: delegue, method: "DELETE" });
});

console.log(`\n${nb} vérification(s) réussie(s)${process.exitCode ? ", des échecs ci-dessus" : ""}.`);
