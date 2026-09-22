// Vérifie qu'un utilisateur a le droit de voir/participer à un canal donné.
// admin -> tout ; sinon -> canaux communs (général/custom, ouverts à tous) + canal
// "annonce" seulement si c'est celui de sa propre promo (MMI2, MMI3...).
// Sert de garde-fou côté serveur : le filtrage de GET /chat/channels n'est
// qu'un filtre d'affichage, il ne protège pas les autres routes par lui-même.
export function utilisateurPeutAccederAuCanal(user, channel) {
  if (!channel) return false;
  if (user.role === "admin") return true;
  if (["general", "custom"].includes(channel.type)) return true;
  if (channel.type === "annonce") return channel.promo === user.promo;
  return false;
}
