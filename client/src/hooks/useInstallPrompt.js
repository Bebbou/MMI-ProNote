import { useState, useEffect } from "react";

// Chrome/Edge/Android déclenchent "beforeinstallprompt" une seule fois, tôt dans la vie de
// la page : on l'écoute dès l'import du module (pas dans un composant qui pourrait ne pas
// encore exister) et on garde l'évènement pour l'utiliser quand l'utilisateur clique.
let evenement = null;
const ecouteurs = new Set();
const prevenir = () => ecouteurs.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on affiche notre propre invitation, au bon moment
    evenement = e;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    evenement = null;
    prevenir();
  });
}

export function useInstallPrompt() {
  const [, forcer] = useState(0);

  useEffect(() => {
    const maj = () => forcer((n) => n + 1);
    ecouteurs.add(maj);
    return () => ecouteurs.delete(maj);
  }, []);

  async function installer() {
    if (!evenement) return null;
    evenement.prompt();
    const { outcome } = await evenement.userChoice; // "accepted" | "dismissed"
    evenement = null; // l'évènement ne peut servir qu'une fois
    prevenir();
    return outcome;
  }

  return { installable: evenement !== null, installer };
}
