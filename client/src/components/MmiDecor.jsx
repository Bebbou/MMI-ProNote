import styles from "./MmiDecor.module.css";

export default function MmiDecor() {
  return (
    <div className={styles.decor} aria-hidden="true">
      {/* Arc rose — quart de cercle plein */}
      <div className={styles.arcPink} />
      {/* Arc bleu hachuré */}
      <div className={styles.arcBlue}>
        <div className={styles.arcBlueHatch} />
      </div>
      {/* Arc orange */}
      <div className={styles.arcOrange} />
      {/* Grille de points */}
      <div className={styles.dotGrid}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className={styles.dot} />
        ))}
      </div>
    </div>
  );
}
