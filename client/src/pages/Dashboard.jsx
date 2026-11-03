import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { SlidersHorizontal, GripVertical } from "lucide-react";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import { WIDGETS } from "../components/widgets";
import { useWidgetPrefs, apercuDeplacement } from "../hooks/useWidgetPrefs";
import { useFlip } from "../hooks/useFlip";
import { useDonneesDashboard } from "../hooks/useDonneesDashboard";
import styles from "./Dashboard.module.css";

const ROLE_LABELS = {
  admin: "Administrateur",
  delegue: "Délégué",
  professeur: "Professeur",
  etudiant: "Étudiant",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { prefs, basculer, deplacer, deplacerVers, reinitialiser } = useWidgetPrefs(user?.id);
  const [edition, setEdition] = useState(false);
  // Chargé une fois ici : plusieurs tuiles se servent des mêmes devoirs et cours
  const donnees = useDonneesDashboard();

  // Glisser-déposer avec les Pointer Events : un seul code pour la souris et le doigt
  // (l'API HTML5 drag-and-drop ne fonctionne pas au tactile).
  // glisse = { id, cible, bas } : le widget tenu, le rang visé, et le bas de chaque ligne
  // mesuré au début du geste (les lignes ont la même hauteur, ces "cases" ne bougent pas).
  const [glisse, setGlisse] = useState(null);
  const listeRef = useRef(null);
  const cartesRef = useRef(null);
  const ordreAffiche = glisse ? apercuDeplacement(prefs, glisse.id, glisse.cible) : prefs;

  // Les lignes du panneau et les cartes glissent vers leur nouvelle place
  useFlip(listeRef);
  useFlip(cartesRef);

  const debutGlisse = (e, id) => {
    if (e.button !== 0) return; // bouton principal ou doigt uniquement
    e.preventDefault(); // pas de sélection de texte pendant le geste
    // La capture garde les événements sur la poignée même si le pointeur en sort
    e.currentTarget.setPointerCapture(e.pointerId);
    // offsetTop (relatif à la liste, en position: relative) ignore les animations en cours,
    // contrairement à getBoundingClientRect qui mesurerait une ligne en plein glissement
    const liste = listeRef.current;
    const haut = liste.getBoundingClientRect().top;
    const bas = [...liste.children].map((li) => haut + li.offsetTop + li.offsetHeight);
    setGlisse({ id, cible: prefs.findIndex((w) => w.id === id), bas });
  };

  const pendantGlisse = (e) => {
    if (!glisse) return;
    // Rang visé : la première ligne dont le bas est sous le pointeur
    let cible = glisse.bas.findIndex((b) => e.clientY < b);
    if (cible === -1) cible = glisse.bas.length - 1;
    if (cible !== glisse.cible) setGlisse({ ...glisse, cible });
  };

  const finGlisse = () => {
    if (!glisse) return;
    deplacerVers(glisse.id, glisse.cible);
    setGlisse(null);
  };

  // Alternative au glisser : flèches haut / bas quand la poignée a le focus
  const clavierPoignee = (e, id) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault(); // la page ne défile pas
      deplacer(id, e.key === "ArrowUp" ? -1 : 1);
    }
  };

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
            <p className={styles.panelAide}>Fais glisser une ligne par sa poignée pour changer l'ordre.</p>
            <ul className={styles.panelList} ref={listeRef}>
              {ordreAffiche.map((w, i) => (
                <li
                  key={w.id}
                  className={`${styles.panelItem} ${glisse?.id === w.id ? styles.panelItemGlisse : ""}`}
                >
                  <button
                    type="button"
                    className={styles.poignee}
                    aria-label={`Déplacer ${WIDGETS[w.id].label}, position ${i + 1} sur ${prefs.length}. Flèches haut et bas pour changer l'ordre.`}
                    onPointerDown={(e) => debutGlisse(e, w.id)}
                    onPointerMove={pendantGlisse}
                    onPointerUp={finGlisse}
                    onPointerCancel={() => setGlisse(null)}
                    onKeyDown={(e) => clavierPoignee(e, w.id)}
                  >
                    <GripVertical size={16} strokeWidth={1.5} />
                  </button>
                  <label>
                    <input type="checkbox" checked={w.visible} onChange={() => basculer(w.id)} />
                    {WIDGETS[w.id].label}
                  </label>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.toolbarBtn} onClick={reinitialiser}>
              Réinitialiser
            </button>
          </div>
        )}

        <div className={styles.cards} ref={cartesRef}>
          {prefs
            .filter((w) => w.visible)
            .map(({ id }) => {
              const { Composant } = WIDGETS[id];
              return <Composant key={id} donnees={donnees} />;
            })}
        </div>
      </div>
    </Layout>
  );
}
