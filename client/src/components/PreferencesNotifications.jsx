import { useState, useEffect } from "react";
import { toast } from "./Toast";
import api from "../api/index.js";
import styles from "./PreferencesNotifications.module.css";

const CATEGORIES = [
  { cle: "devoirs", titre: "Devoirs et évaluations", detail: "Dès qu'un nouveau travail est publié" },
  { cle: "rappels", titre: "Rappels d'échéance", detail: "La veille, si tu n'as pas encore rendu" },
  { cle: "cours", titre: "Nouveaux cours", detail: "Quand un enseignant ou un admin publie un support" },
  { cle: "annonces", titre: "Annonces", detail: "Les messages importants de ta promo" },
];

// Choix des types de notification : valable pour le push comme pour la cloche de l'application
export default function PreferencesNotifications() {
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    api
      .get("/notifications/preferences")
      .then((res) => setPrefs(res.data))
      .catch(() => setPrefs(null));
  }, []);

  async function basculer(cle) {
    const valeur = !prefs[cle];
    setPrefs((p) => ({ ...p, [cle]: valeur })); // optimiste : annulé si le serveur refuse
    try {
      await api.put("/notifications/preferences", { [cle]: valeur });
    } catch {
      setPrefs((p) => ({ ...p, [cle]: !valeur }));
      toast("Impossible d'enregistrer ce réglage", "error");
    }
  }

  if (!prefs) return null;

  return (
    <div className={styles.bloc}>
      <h3 className={styles.titre}>Quoi recevoir</h3>
      {CATEGORIES.map(({ cle, titre, detail }) => (
        <label key={cle} className={styles.ligne}>
          <span className={styles.texte}>
            <span className={styles.nom}>{titre}</span>
            <span className={styles.detail}>{detail}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className={styles.interrupteur}
            checked={prefs[cle]}
            onChange={() => basculer(cle)}
          />
        </label>
      ))}
    </div>
  );
}
