import { useEffect, useRef } from "react";

const SELECTEUR_FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modales ouvertes, de la plus ancienne à la plus récente : seule la dernière
// réagit au clavier, sinon Échap fermerait toutes les modales empilées d'un coup.
const pile = [];

/*
 * Comportement clavier commun aux modales : le focus entre dans la modale à
 * l'ouverture, Tab reste à l'intérieur, Échap ferme, et le focus revient à
 * l'élément d'origine à la fermeture.
 * Usage : const modalRef = useModal(ouverte, fermer), puis ref={modalRef} sur la modale.
 */
export function useModal(ouverte, onFermer) {
  const modalRef = useRef(null);
  const onFermerRef = useRef(onFermer);

  // Garde la dernière fonction sans relancer l'effet d'ouverture à chaque rendu
  useEffect(() => {
    onFermerRef.current = onFermer;
  });

  useEffect(() => {
    if (!ouverte) return;
    const modal = modalRef.current;
    const focusPrecedent = document.activeElement;
    const focusables = () => [...modal.querySelectorAll(SELECTEUR_FOCUSABLE)];

    pile.push(modal);
    // Un champ en autoFocus a déjà pris le focus : on ne le lui retire pas
    if (!modal.contains(document.activeElement)) focusables()[0]?.focus();

    function onKeyDown(e) {
      if (pile[pile.length - 1] !== modal) return;
      if (e.key === "Escape") {
        onFermerRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const liste = focusables();
      if (liste.length === 0) return;
      const premier = liste[0];
      const dernier = liste[liste.length - 1];
      const actif = document.activeElement;
      if (!modal.contains(actif) || (!e.shiftKey && actif === dernier)) {
        e.preventDefault();
        premier.focus();
      } else if (e.shiftKey && actif === premier) {
        e.preventDefault();
        dernier.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      pile.splice(pile.indexOf(modal), 1);
      focusPrecedent?.focus?.();
    };
  }, [ouverte]);

  return modalRef;
}
