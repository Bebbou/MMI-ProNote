import prisma from "../db.js";

// Vérifie qu'un utilisateur a le droit de voir/participer à un canal donné.
// admin -> tout ; sinon -> canaux communs (général/annonces/custom) + canal de
// son groupe précis (ex. TDA1) + canal combiné de sa filière (TDA/TDB).
// Sert de garde-fou côté serveur : le filtrage de GET /chat/channels n'est
// qu'un filtre d'affichage, il ne protège pas les autres routes par lui-même.
export async function utilisateurPeutAccederAuCanal(user, channel) {
  if (!channel) return false;
  if (user.role === "admin") return true;
  if (["general", "annonce", "custom"].includes(channel.type)) return true;

  const groupe = await prisma.groupe.findUnique({
    where: { id: user.groupeId },
    select: { nom: true },
  });
  if (!groupe) return false;

  const tdNom = "TD" + groupe.nom.slice(-2, -1);
  if (channel.type === "groupe" && channel.nom === groupe.nom) return true;
  if (channel.nom === tdNom) return true;
  return false;
}
