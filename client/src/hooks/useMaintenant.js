import { useState, useEffect } from "react";

// L'heure actuelle, rafraîchie toutes les minutes : le "dans 24 min" et le repère de la
// frise de la journée avancent sans recharger la page.
export function useMaintenant(pasMs = 60 * 1000) {
  const [maintenant, setMaintenant] = useState(() => new Date());

  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(new Date()), pasMs);
    return () => clearInterval(minuteur);
  }, [pasMs]);

  return maintenant;
}
