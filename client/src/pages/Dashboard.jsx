import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { SlidersHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import { WIDGETS } from "../components/widgets";
import { useWidgetPrefs } from "../hooks/useWidgetPrefs";
import styles from "./Dashboard.module.css";

const ROLE_LABELS = {
  admin: "Administrateur",
  delegue: "Délégué",
  professeur: "Professeur",
  etudiant: "Étudiant",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { prefs, basculer, deplacer, reinitialiser } = useWidgetPrefs(user?.id);
  const [edition, setEdition] = useState(false);

  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role ?? "";
  const groupe = user?.groupe ?? "";

  return (
    <Layout>
      <div className={styles.page}>
        <PageTitle>Bienvenue, {user?.nom}</PageTitle>
        {(groupe || roleLabel) && (
          <p className={styles.subtitle}>
            {groupe && <span>Groupe {groupe}</span>}
            {groupe && roleLabel && " · "}
            {roleLabel && <span>{roleLabel}</span>}
          </p>
        )}

        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => setEdition(!edition)}
            aria-expanded={edition}
          >
            <SlidersHorizontal size={14} strokeWidth={1.5} />
            Personnaliser
          </button>
        </div>

        {edition && (
          <div className={styles.panel}>
            <ul className={styles.panelList}>
              {prefs.map((w, i) => (
                <li key={w.id} className={styles.panelItem}>
                  <label>
                    <input type="checkbox" checked={w.visible} onChange={() => basculer(w.id)} />
                    {WIDGETS[w.id].label}
                  </label>
                  <span className={styles.panelMoves}>
                    <button
                      type="button"
                      aria-label={`Monter ${WIDGETS[w.id].label}`}
                      disabled={i === 0}
                      onClick={() => deplacer(w.id, -1)}
                    >
                      <ChevronUp size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Descendre ${WIDGETS[w.id].label}`}
                      disabled={i === prefs.length - 1}
                      onClick={() => deplacer(w.id, 1)}
                    >
                      <ChevronDown size={14} strokeWidth={1.5} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.toolbarBtn} onClick={reinitialiser}>
              Réinitialiser
            </button>
          </div>
        )}

        <div className={styles.cards}>
          {prefs
            .filter((w) => w.visible)
            .map(({ id }) => {
              const { Composant } = WIDGETS[id];
              return <Composant key={id} />;
            })}
        </div>
      </div>
    </Layout>
  );
}
