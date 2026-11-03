import { Link } from "react-router-dom";
import { BarChart2 } from "lucide-react";
import styles from "../../pages/Dashboard.module.css";

const LARGEUR = 90;
const HAUTEUR = 34;
const format = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Points de la courbe des dernières notes : de la plus ancienne (gauche) à la plus récente,
// la note (0 à 20) est ramenée à la hauteur du dessin
function pointsCourbe(valeurs) {
  return valeurs
    .map((v, i) => {
      const x = 2 + (i / (valeurs.length - 1)) * (LARGEUR - 4);
      const y = HAUTEUR - 3 - (v / 20) * (HAUTEUR - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function NotesWidget({ donnees }) {
  const { notes, erreurs } = donnees;

  // Moyenne pondérée. Si la somme des coefficients est nulle on n'affiche pas de moyenne
  // (division par zéro) plutôt que "NaN".
  const totalCoef = notes?.reduce((acc, n) => acc + n.coefficient, 0) ?? 0;
  const moyenne =
    totalCoef > 0 ? notes.reduce((acc, n) => acc + n.valeur * n.coefficient, 0) / totalCoef : null;
  // L'API renvoie les notes de la plus récente à la plus ancienne
  const recentes = notes?.slice(0, 8).reverse() ?? [];
  const derniere = notes?.[0] ?? null;

  return (
    <Link to="/notes" className={`${styles.tuile} ${styles.tuileMoyenne}`}>
      <p className={styles.etiquette}>
        <BarChart2 size={14} strokeWidth={1.5} aria-hidden="true" />
        Moyenne
      </p>
      {erreurs.notes ? (
        <p className={styles.stat}>Notes indisponibles</p>
      ) : notes === null ? (
        <p className={styles.grand}>…</p>
      ) : moyenne === null ? (
        <p className={styles.stat}>Aucune note</p>
      ) : (
        <div className={styles.moyenneLigne}>
          <p className={styles.grand}>
            {format(moyenne)}
            <span className={styles.grandUnite}> / 20</span>
          </p>
          {recentes.length > 1 && (
            <svg className={styles.courbe} viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} aria-hidden="true">
              <polyline points={pointsCourbe(recentes.map((n) => n.valeur))} />
            </svg>
          )}
        </div>
      )}
      {derniere && (
        <p
          className={styles.detail}
        >{`Dernière : ${derniere.valeur.toLocaleString("fr-FR")} en ${derniere.matiere}`}</p>
      )}
    </Link>
  );
}
