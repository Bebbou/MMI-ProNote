import { useState, useCallback } from "react";

// Préférences d'affichage du Dashboard, par appareil et par utilisateur (localStorage).
// Ne stocke que des identifiants de widgets : aucune donnée métier.
export const WIDGETS_PAR_DEFAUT = ["devoirs", "notes", "edt", "chat", "documents"];

function lire(cle) {
  try {
    const brut = JSON.parse(localStorage.getItem(cle));
    if (!Array.isArray(brut)) return null;
    // Ne garde que les entrées valides : un id inconnu (ancienne version) est ignoré
    const items = brut
      .filter((w) => w && WIDGETS_PAR_DEFAUT.includes(w.id))
      .map((w) => ({ id: w.id, visible: w.visible !== false }));
    // Un widget ajouté depuis la dernière sauvegarde apparaît à la fin
    for (const id of WIDGETS_PAR_DEFAUT) {
      if (!items.some((w) => w.id === id)) items.push({ id, visible: true });
    }
    return items;
  } catch {
    return null;
  }
}

export function useWidgetPrefs(userId) {
  const cle = `widgets:${userId ?? "anonyme"}`;
  const [prefs, setPrefs] = useState(
    () => lire(cle) ?? WIDGETS_PAR_DEFAUT.map((id) => ({ id, visible: true })),
  );

  const enregistrer = useCallback(
    (suivant) => {
      setPrefs(suivant);
      try {
        localStorage.setItem(cle, JSON.stringify(suivant));
      } catch {
        // quota plein ou stockage bloqué : la préférence vaut pour la session seulement
      }
    },
    [cle],
  );

  const basculer = (id) =>
    enregistrer(prefs.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));

  const deplacer = (id, sens) => {
    const i = prefs.findIndex((w) => w.id === id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= prefs.length) return;
    const copie = [...prefs];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    enregistrer(copie);
  };

  const reinitialiser = () =>
    enregistrer(WIDGETS_PAR_DEFAUT.map((id) => ({ id, visible: true })));

  return { prefs, basculer, deplacer, reinitialiser };
}
