import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { useMaintenant } from "../../hooks/useMaintenant";
import { estARendre, libelleEcheance } from "../../utils/echeance";
import { memeJour } from "../../utils/semaine";
import { dureeCourte } from "../../utils/temps";
import styles from "../../pages/Dashboard.module.css";

// "10h15" : le format d'heure de l'emploi du temps
const heure = (date) =>
  date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
const intitule = (c) => (c.salle ? `${c.matiere} · ${c.salle}` : c.matiere);
// Heure décimale (10h30 -> 10.5), pour placer un cours sur la frise
const decimale = (date) => date.getHours() + date.getMinutes() / 60;

// Les cours du jour, sans les cours annulés, dans l'ordre
function coursDuJour(cours, now) {
  return (cours ?? [])
    .filter((c) => !c.annule)
    .map((c) => ({ ...c, debut: new Date(c.dateDebut), fin: new Date(c.dateFin) }))
    .filter((c) => memeJour(c.debut, now))
    .sort((a, b) => a.debut - b.debut);
}

// Le grand bloc du Dashboard : il répond à "qu'est-ce que j'ai maintenant ?" et change selon
// le moment de la journée (cours en cours, prochain cours, ou plus rien aujourd'hui).
export default function EdtWidget({ donnees }) {
  const { cours, devoirs, erreurs } = donnees;
  const now = useMaintenant();
  const jour = coursDuJour(cours, now);
  const enCours = jour.find((c) => c.debut <= now && now < c.fin);
  const suivant = jour.find((c) => c.debut > now);

  let etiquette = "Aujourd'hui";
  let titre;
  let detail = "";

  if (erreurs.cours) {
    titre = "Emploi du temps indisponible";
    detail = "Impossible de charger les cours. Réessaie dans un instant.";
  } else if (cours === null) {
    titre = "Chargement…";
  } else if (enCours) {
    etiquette = "Maintenant";
    titre = intitule(enCours);
    detail =
      `Se termine dans ${dureeCourte(enCours.fin - now)}. ` +
      (suivant ? `Ensuite : ${suivant.matiere} à ${heure(suivant.debut)}.` : "Dernier cours de la journée.");
  } else if (suivant) {
    etiquette = "Prochain cours";
    titre = intitule(suivant);
    detail = `Commence à ${heure(suivant.debut)}, dans ${dureeCourte(suivant.debut - now)}.`;
  } else {
    titre = jour.length > 0 ? "Plus de cours aujourd'hui" : "Pas de cours aujourd'hui";
    // Plus de cours : on propose la suite utile, le prochain devoir à rendre
    const prochain = (devoirs ?? [])
      .filter((d) => estARendre(d, now))
      .sort((a, b) => new Date(a.dateLimite) - new Date(b.dateLimite))[0];
    detail = prochain
      ? `Prochain devoir : ${prochain.titre}, ${libelleEcheance(prochain.dateLimite, now).principal.toLowerCase()}.`
      : devoirs !== null
        ? "Rien à rendre pour l'instant."
        : "";
  }

  // Frise de la journée : de 8h à 18h au minimum, élargie si un cours dépasse. On garde un
  // nombre pair d'heures pour que les repères tombent toutes les 2 h.
  let frise = null;
  if (jour.length > 0) {
    const debutH = Math.min(8, Math.floor(decimale(jour[0].debut)));
    let finH = Math.max(18, Math.ceil(decimale(jour[jour.length - 1].fin)));
    if ((finH - debutH) % 2 !== 0) finH += 1;
    const total = finH - debutH;
    const position = (date) => ((decimale(date) - debutH) / total) * 100;
    const repereMaintenant = position(now);
    const heures = Array.from({ length: total / 2 + 1 }, (_, i) => debutH + i * 2);

    frise = (
      <div aria-hidden="true">
        <div className={styles.frise}>
          {jour.map((c) => {
            const etat = c === enCours ? styles.segEnCours : c.fin <= now ? "" : styles.segSuivant;
            return (
              <span
                key={c.id}
                className={`${styles.seg} ${etat}`}
                style={{ left: `${position(c.debut)}%`, width: `${position(c.fin) - position(c.debut)}%` }}
              />
            );
          })}
          {repereMaintenant >= 0 && repereMaintenant <= 100 && (
            <span className={styles.repere} style={{ left: `${repereMaintenant}%` }} />
          )}
        </div>
        <div className={styles.heures}>
          {heures.map((h, i) => (
            <span key={h} style={{ left: `${(i / (heures.length - 1)) * 100}%` }}>
              {h}h
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link to="/edt" className={`${styles.tuile} ${styles.tuileHero}`}>
      <p className={styles.etiquette}>
        <Clock size={14} strokeWidth={1.5} aria-hidden="true" />
        {etiquette}
      </p>
      <div>
        <p className={styles.titreHero}>{titre}</p>
        {detail && <p className={styles.detail}>{detail}</p>}
      </div>
      {frise}
    </Link>
  );
}
