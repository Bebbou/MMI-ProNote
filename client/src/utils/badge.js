// Pastille sur l'icône de la PWA installée (Badging API). Absente sur certains navigateurs
// (et hors PWA installée) : dans ce cas on ne fait rien.
export function majPastille(nombre) {
  if (!("setAppBadge" in navigator)) return;
  const action =
    nombre > 0 ? navigator.setAppBadge(nombre) : navigator.clearAppBadge?.();
  // La promesse peut être rejetée (permission refusée) : sans importance pour l'utilisateur
  Promise.resolve(action).catch(() => {});
}
