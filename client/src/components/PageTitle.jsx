import styles from "./PageTitle.module.css";

/* Titre de page avec la barre tricolore inspirée du logo MMI */
export default function PageTitle({ children }) {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>{children}</h1>
      <div className={styles.bar}>
        <span className={styles.segPink} />
        <span className={styles.segStripes} />
        <span className={styles.segOrange} />
      </div>
    </div>
  );
}
