import { Code2 } from "lucide-react";
import pkg from "../../package.json";
import styles from "./AppFooter.module.css";

/* Footer discret, affiche uniquement sur la page Profil */
export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.bar}>
        <span className={styles.segPink} />
        <span className={styles.segStripes} />
        <span className={styles.segOrange} />
      </div>
      <p className={styles.line}>
        Pronote-MMI v{pkg.version} — fait par Lino Volle
      </p>
      <div className={styles.links}>
        <a
          href="https://github.com/Bebbou/MMI-ProNote"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          <Code2 size={13} strokeWidth={1.5} />
          GitHub
        </a>
        <span className={styles.sep}>·</span>
        <a
          href="https://github.com/Bebbou/MMI-ProNote/blob/main/CREDITS.md"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Crédits
        </a>
      </div>
    </footer>
  );
}
