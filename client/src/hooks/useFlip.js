import { useLayoutEffect, useRef } from "react";

// Animation FLIP (First, Last, Invert, Play) : quand les enfants d'un conteneur changent
// de place, chacun glisse de son ancienne position vers la nouvelle au lieu de sauter.
//   First  : la position de chaque enfant a été mémorisée au rendu précédent
//   Last   : React a déjà mis le DOM à jour, on mesure la nouvelle position
//   Invert : on décale l'enfant pour qu'il paraisse encore à son ancienne place
//   Play   : on anime ce décalage jusqu'à zéro
// useLayoutEffect s'exécute après la mise à jour du DOM mais avant que le navigateur
// n'affiche l'image : l'utilisateur ne voit jamais l'élément à sa place finale avant l'animation.
// Les positions viennent de offsetLeft/offsetTop, que les transformations en cours n'affectent pas.

const DUREE = 220;
const COURBE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

export function useFlip(conteneurRef) {
  // Map élément DOM -> position : React garde le même nœud DOM pour une même `key`
  const positions = useRef(new Map());

  useLayoutEffect(() => {
    const conteneur = conteneurRef.current;
    if (!conteneur) {
      positions.current = new Map();
      return;
    }
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const premierRendu = positions.current.size === 0;
    const suivantes = new Map();

    for (const el of conteneur.children) {
      const pos = { x: el.offsetLeft, y: el.offsetTop };
      suivantes.set(el, pos);
      if (reduit || premierRendu) continue;

      const avant = positions.current.get(el);
      if (!avant) {
        // Élément qui vient d'apparaître (widget réaffiché) : léger fondu
        el.animate(
          [
            { opacity: 0, scale: 0.97 },
            { opacity: 1, scale: 1 },
          ],
          { duration: DUREE, easing: COURBE }
        );
        continue;
      }
      const dx = avant.x - pos.x;
      const dy = avant.y - pos.y;
      if (dx || dy) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
          duration: DUREE,
          easing: COURBE,
        });
      }
    }
    positions.current = suivantes;
  });
}
