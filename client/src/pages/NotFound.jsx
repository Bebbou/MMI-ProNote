import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./NotFound.module.css";

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <svg className={styles.circle} viewBox="0 0 200 200" fill="none" aria-hidden="true">
        <path d="M 100 20 A 80 80 0 0 0 24 75" stroke="var(--accent)" strokeWidth="26" />
        <path
          d="M 21 118 A 80 80 0 0 0 97 180"
          stroke="var(--accent-blue)"
          strokeWidth="26"
          strokeDasharray="6 4"
        />
        <path d="M 140 169 A 80 80 0 0 0 179 112" stroke="var(--accent-orange)" strokeWidth="26" />
      </svg>
      <h1 className={styles.code}>404</h1>
      <p className={styles.message}>Cette page n'existe pas (ou plus).</p>
      <Link to={user ? "/dashboard" : "/login"} className={styles.backBtn}>
        {user ? "Retour à l'accueil" : "Retour à la connexion"}
      </Link>
    </div>
  );
}
