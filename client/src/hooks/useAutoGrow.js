import { useLayoutEffect, useRef } from "react";

// Ajuste la hauteur d'un textarea à son contenu (issue #54). Le CSS plafonne via max-height :
// au-delà, le champ défile au lieu de pousser le formulaire hors de l'écran.
export function useAutoGrow(value) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return ref;
}
