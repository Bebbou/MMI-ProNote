import { useState, useEffect, useCallback } from "react";
import api from "../api/index.js";

const ACTUALISATION_MS = 60 * 1000;

// Historique des notifications de l'utilisateur (la cloche). Actualisé toutes les minutes
// et au retour sur l'onglet : le push gère l'immédiat, la cloche sert de mémoire.
export function useNotifications(actif = true) {
  const [items, setItems] = useState([]);
  const [nonLues, setNonLues] = useState(0);

  const charger = useCallback(() => {
    api
      .get("/notifications")
      .then((res) => {
        setItems(res.data.items);
        setNonLues(res.data.nonLues);
      })
      .catch(() => {}); // hors-ligne ou serveur indisponible : on garde l'affichage précédent
  }, []);

  useEffect(() => {
    if (!actif) return;
    charger();
    const timer = setInterval(charger, ACTUALISATION_MS);
    const auRetour = () => document.visibilityState === "visible" && charger();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [actif, charger]);

  const marquerLues = useCallback(async () => {
    setNonLues(0);
    setItems((prev) => prev.map((n) => (n.luAt ? n : { ...n, luAt: new Date().toISOString() })));
    try {
      await api.post("/notifications/lues");
    } catch {
      charger(); // l'enregistrement a échoué : on reprend l'état réel du serveur
    }
  }, [charger]);

  return { items, nonLues, marquerLues };
}
