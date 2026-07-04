import styles from "./MmiDecor.module.css";

/*
 * Éléments décoratifs inspirés du logo MMI Béziers :
 * cercle brisé en arcs (rose / bleu hachuré / orange), grille de points.
 * Couche fixe en arrière-plan, les couleurs suivent le thème actif.
 */
export default function MmiDecor() {
  return (
    <div className={styles.decor} aria-hidden="true">
      {/* Grand cercle brisé, en haut à droite */}
      <svg className={styles.circleTop} viewBox="0 0 200 200" fill="none">
        <defs>
          <pattern id="mmiStripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <rect width="4" height="8" fill="var(--accent-blue)" />
          </pattern>
        </defs>
        {/* arc rose : de -230° à -10° environ, comme le logo */}
        <path
          d="M 100 20 A 80 80 0 0 0 24 75"
          stroke="var(--accent)"
          strokeWidth="26"
          strokeLinecap="butt"
        />
        {/* arc hachuré bleu */}
        <path
          d="M 21 118 A 80 80 0 0 0 97 180"
          stroke="url(#mmiStripes)"
          strokeWidth="26"
          strokeLinecap="butt"
        />
        {/* arc orange */}
        <path
          d="M 140 169 A 80 80 0 0 0 179 112"
          stroke="var(--accent-orange)"
          strokeWidth="26"
          strokeLinecap="butt"
        />
      </svg>

      {/* Petit cercle brisé, en bas à gauche */}
      <svg className={styles.circleBottom} viewBox="0 0 120 120" fill="none">
        <path
          d="M 60 12 A 48 48 0 0 0 14 45"
          stroke="var(--accent)"
          strokeWidth="16"
        />
        <path
          d="M 20 92 A 48 48 0 0 0 82 103"
          stroke="var(--accent-blue)"
          strokeWidth="16"
        />
      </svg>

      {/* Grille de points, milieu droite */}
      <svg className={styles.dots} viewBox="0 0 100 100" fill="var(--accent)">
        {Array.from({ length: 25 }, (_, i) => (
          <circle key={i} cx={10 + (i % 5) * 20} cy={10 + Math.floor(i / 5) * 20} r="2.5" />
        ))}
      </svg>
    </div>
  );
}
