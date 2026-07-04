import styles from "./Skeleton.module.css";

/* Cartes fantomes affichees pendant le chargement */
export function SkeletonCards({ count = 3, height = 90 }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.card} style={{ height }} />
      ))}
    </div>
  );
}
