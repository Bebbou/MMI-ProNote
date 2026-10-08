import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BookOpen, Clock, FolderOpen, Megaphone } from "lucide-react";
import { depuis } from "../utils/temps";
import styles from "./NotificationsBell.module.css";

const ICONES = { devoir: BookOpen, rappel: Clock, cours: FolderOpen, annonce: Megaphone };

// Cloche des notifications. Deux présentations : "nav" (élément de la barre latérale) et
// "header" (icône de l'en-tête mobile). Les données viennent de Layout (une seule actualisation).
export default function NotificationsBell({ variant, items, nonLues, marquerLues, classes = {} }) {
  const [ouvert, setOuvert] = useState(false);
  // Notifications non lues à l'ouverture : on les garde en surbrillance même si on les
  // marque lues tout de suite côté serveur
  const [surlignees, setSurlignees] = useState(new Set());
  const racine = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e) => racine.current && !racine.current.contains(e.target) && setOuvert(false);
    const echap = (e) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  function basculer() {
    if (!ouvert) {
      setSurlignees(new Set(items.filter((n) => !n.luAt).map((n) => n.id)));
      if (nonLues > 0) marquerLues();
    }
    setOuvert((v) => !v);
  }

  function ouvrir(notif) {
    setOuvert(false);
    navigate(notif.url);
  }

  return (
    <div className={`${styles.racine} ${styles[variant]}`} ref={racine}>
      <button
        className={`${styles.bouton} ${classes.bouton ?? ""} ${ouvert ? styles.boutonOuvert : ""}`}
        onClick={basculer}
        aria-label={nonLues > 0 ? `Notifications (${nonLues} non lues)` : "Notifications"}
        aria-expanded={ouvert}
      >
        <span className={styles.icone}>
          <Bell size={variant === "header" ? 18 : 15} strokeWidth={1.5} />
          {nonLues > 0 && <span className={styles.pastille}>{nonLues > 9 ? "9+" : nonLues}</span>}
        </span>
        {variant === "nav" && <span className={classes.label}>Notifications</span>}
      </button>

      {ouvert && (
        <div className={styles.panneau} role="dialog" aria-label="Notifications">
          <div className={styles.entete}>Notifications</div>
          {items.length === 0 ? (
            <p className={styles.vide}>
              Rien pour l'instant. Les nouveaux devoirs, cours et annonces apparaîtront ici.
            </p>
          ) : (
            <ul className={styles.liste}>
              {items.map((n) => {
                const Icone = ICONES[n.categorie] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      className={`${styles.item} ${surlignees.has(n.id) ? styles.itemNonLu : ""}`}
                      onClick={() => ouvrir(n)}
                    >
                      <span className={styles.itemIcone}>
                        <Icone size={14} strokeWidth={1.5} />
                      </span>
                      <span className={styles.itemTexte}>
                        <span className={styles.itemTitre}>{n.titre}</span>
                        <span className={styles.itemCorps}>{n.corps}</span>
                        <span className={styles.itemDate}>{depuis(n.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            className={styles.reglages}
            onClick={() => {
              setOuvert(false);
              navigate("/profil");
            }}
          >
            Réglages des notifications
          </button>
        </div>
      )}
    </div>
  );
}
