// Aide à la détection de l'environnement PWA (installation, iOS) et mise en sommeil des
// invitations : "Plus tard" ne doit pas réapparaître à chaque page.

export function estInstalle() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function estIOS() {
  if (typeof navigator === "undefined") return false;
  // iPadOS se présente comme un Mac : on le reconnaît à son écran tactile
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

const JOUR_MS = 24 * 60 * 60 * 1000;

export function enSommeil(cle) {
  try {
    const jusqua = Number(localStorage.getItem(`sommeil:${cle}`));
    return Number.isFinite(jusqua) && Date.now() < jusqua;
  } catch {
    return false;
  }
}

export function mettreEnSommeil(cle, jours) {
  try {
    localStorage.setItem(`sommeil:${cle}`, String(Date.now() + jours * JOUR_MS));
  } catch {
    // stockage indisponible (navigation privée...) : l'invitation reviendra, sans gravité
  }
}
