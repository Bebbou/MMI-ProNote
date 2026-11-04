import { useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { majPastille } from "../../utils/badge";
import { estARendre, libelleEcheance } from "../../utils/echeance";
import { debutDeSemaine } from "../../utils/semaine";
import styles from "../../pages/Dashboard.module.css";

// Circonférence du cercle de l'anneau (rayon 44) : sert à dessiner la part de devoirs rendus
const CIRCONFERENCE = 2 * Math.PI * 44;

export default function DevoirsWidget({ donnees }) {
  const { devoirs, erreurs } = donnees;
  const now = new Date();

  // Le compteur ne doit refléter que ce qu'il reste à faire : "rendu" prime sur la
  // date, sinon cocher un devoir ne fait jamais bouger le chiffre (issue #43).
  const aRendre = devoirs?.filter((d) => estARendre(d)) ?? [];
  const prochain = [...aRendre].sort((a, b) => new Date(a.dateLimite) - new Date(b.dateLimite))[0] ?? null;

  // Pastille d'icône de l'application : le nombre de devoirs à rendre
  useEffect(() => {
    if (devoirs !== null) majPastille(aRendre.length);
  }, [devoirs, aRendre.length]);

  // L'anneau : devoirs de la semaine (lundi à dimanche) déjà rendus. Les évaluations ne
  // se "rendent" pas, elles sont exclues du calcul.
  const debut = debutDeSemaine(now);
  const fin = new Date(debut);
  fin.setDate(debut.getDate() + 7);
  const semaine = (devoirs ?? []).filter((d) => {
    const limite = new Date(d.dateLimite);
    return d.type !== "Evaluation" && limite >= debut && limite < fin;
  });
  const rendus = semaine.filter((d) => d.rendu).length;
  const part = semaine.length > 0 ? rendus / semaine.length : 0;

  let ligne1 = "";
  let ligne2 = "";
  if (erreurs.devoirs) {
    ligne1 = "Devoirs indisponibles";
    ligne2 = "Réessaie dans un instant.";
  } else if (devoirs !== null) {
    ligne1 = aRendre.length === 0 ? "Rien à rendre pour l'instant" : `${aRendre.length} à rendre`;
    ligne2 = prochain
      ? `Prochain : ${prochain.titre}, ${libelleEcheance(prochain.dateLimite, now).principal.toLowerCase()}`
      : "";
  }

  return (
    <Link to="/devoirs" className={`${styles.tuile} ${styles.tuileAnneau}`}>
      <p className={styles.etiquette}>
        <BookOpen size={14} strokeWidth={1.5} aria-hidden="true" />
        Devoirs cette semaine
      </p>
      <svg
        className={styles.anneau}
        viewBox="0 0 108 108"
        role="img"
        aria-label={
          semaine.length > 0
            ? `${rendus} devoirs rendus sur ${semaine.length} cette semaine`
            : "Aucun devoir cette semaine"
        }
      >
        <circle className={styles.anneauPiste} cx="54" cy="54" r="44" />
        <circle
          className={styles.anneauValeur}
          cx="54"
          cy="54"
          r="44"
          transform="rotate(-90 54 54)"
          strokeDasharray={`${part * CIRCONFERENCE} ${CIRCONFERENCE}`}
        />
        <text className={styles.anneauNombre} x="54" y="56" textAnchor="middle">
          {devoirs === null ? "…" : semaine.length > 0 ? `${rendus}/${semaine.length}` : "0"}
        </text>
        <text className={styles.anneauLegende} x="54" y="72" textAnchor="middle">
          {semaine.length > 0 ? "rendus" : "cette semaine"}
        </text>
      </svg>
      <div className={styles.anneauTextes}>
        <p className={styles.stat}>{ligne1}</p>
        {ligne2 && <p className={styles.detail}>{ligne2}</p>}
      </div>
    </Link>
  );
}
