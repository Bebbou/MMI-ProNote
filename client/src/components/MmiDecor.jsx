import styles from "./MmiDecor.module.css";

export default function MmiDecor({ variant = "default" }) {
  return (
    <div className={`${styles.decor} ${styles[variant]}`} aria-hidden="true">
      <div className={styles.dotGrid} />
      <div className={styles.arcPink} />
      <div className={styles.arcOrange} />
      <div className={styles.arcBlue} />
    </div>
  );
}
