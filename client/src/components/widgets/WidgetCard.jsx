import { Link } from "react-router-dom";
import styles from "../../pages/Dashboard.module.css";

// Petite tuile de raccourci (Chat, Cours) : une icône et un libellé, rien à charger
export default function WidgetCard({ to, label, icon: Icon }) {
  return (
    <Link to={to} className={`${styles.tuile} ${styles.tuilePetite}`}>
      <span className={styles.tuileIcone}>
        <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className={styles.tuileLabel}>{label}</p>
    </Link>
  );
}
