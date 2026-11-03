import { useState, useEffect } from "react";
import api from "../api/index.js";

// Les trois jeux de données du Dashboard, chargés une seule fois pour toutes les tuiles
// (les devoirs et l'emploi du temps servent à plusieurs d'entre elles).
// `null` = chargement en cours. `erreurs.<cle>` = l'appel a échoué : la tuile le dit au
// lieu de faire passer une panne réseau pour "aucune note" ou "rien à rendre".
export function useDonneesDashboard() {
  const [donnees, setDonnees] = useState({ devoirs: null, cours: null, notes: null });
  const [erreurs, setErreurs] = useState({});

  useEffect(() => {
    // `actif` évite de mettre à jour l'état d'un composant déjà démonté
    let actif = true;
    const charger = (cle, url) =>
      api
        .get(url)
        .then((res) => actif && setDonnees((d) => ({ ...d, [cle]: res.data })))
        .catch(() => actif && setErreurs((e) => ({ ...e, [cle]: true })));

    charger("devoirs", "/devoirs");
    charger("cours", "/edt");
    charger("notes", "/notes");
    return () => {
      actif = false;
    };
  }, []);

  return { ...donnees, erreurs };
}
