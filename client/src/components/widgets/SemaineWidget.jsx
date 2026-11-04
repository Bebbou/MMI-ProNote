import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { estARendre } from "../../utils/echeance";
import { joursOuvres, memeJour } from "../../utils/semaine";
import styles from "../../pages/Dashboard.module.css";

// Lundi à vendredi : le jour actuel est en relief, un contour orange signale une échéance
export default function SemaineWidget({ donnees }) {
  const { devoirs } = donnees;
  const now = new Date();
  const aRendre = (devoirs ?? []).filter((d) => estARendre(d, now));

  return (
    <Link to="/devoirs" className={`${styles.tuile} ${styles.tuileSemaine}`}>
      <p className={styles.etiquette}>
        <CalendarDays size={14} strokeWidth={1.5} aria-hidden="true" />
        Cette semaine
      </p>
      <div className={styles.jours}>
        {joursOuvres(now).map((jour) => {
          const echeances = aRendre.filter((d) => memeJour(new Date(d.dateLimite), jour)).length;
          const aujourdhui = memeJour(jour, now);
          const classes = [
            styles.jour,
            aujourdhui && styles.jourAujourdhui,
            echeances > 0 && styles.jourEcheance,
          ]
            .filter(Boolean)
            .join(" ");
          const nom = jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
          return (
            <span
              key={jour.getTime()}
              className={classes}
              aria-label={`${nom}${aujourdhui ? ", aujourd'hui" : ""}${echeances > 0 ? `, ${echeances} échéance${echeances > 1 ? "s" : ""}` : ""}`}
            >
              <span aria-hidden="true">{jour.toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
              <span className={styles.jourNum} aria-hidden="true">
                {jour.getDate()}
              </span>
            </span>
          );
        })}
      </div>
    </Link>
  );
}
