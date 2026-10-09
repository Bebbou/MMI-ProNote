import { Link } from "react-router-dom";
import styles from "../../pages/Dashboard.module.css";

export default function WidgetCard({ to, label, icon: Icon, stat, detail }) {
  return (
    <Link to={to} className={styles.card}>
      <span className={styles.cardIcon}>
        <Icon size={16} strokeWidth={1.5} />
      </span>
      <p className={styles.cardLabel}>{label}</p>
      <p className={styles.cardStat}>{stat}</p>
      {detail && <p className={styles.cardDetail}>{detail}</p>}
    </Link>
  );
}
