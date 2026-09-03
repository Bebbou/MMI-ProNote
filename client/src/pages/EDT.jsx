import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import api from "../api/index.js";
import styles from "./EDT.module.css";

const NOMS_JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const HEURE_MIN_DEFAUT = 8;
const HEURE_MAX_DEFAUT = 18;
const HAUTEUR_HEURE = 64; // px par heure dans la grille
const PALETTE = ["bleu", "rose", "orange"]; // cycle de couleurs par matière (voir CSS)

// Lundi de la semaine contenant `date`
function lundiDeLaSemaine(date) {
  const d = new Date(date);
  const jour = d.getDay(); // 0 = dimanche
  const decalage = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + decalage);
  d.setHours(0, 0, 0, 0);
  return d;
}

function minutesDepuisMinuit(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatHeure(date) {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function memeJour(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Hash simple et stable pour attribuer une couleur cohérente à chaque matière
function couleurMatiere(matiere) {
  let h = 0;
  for (let i = 0; i < matiere.length; i++) h = (h * 31 + matiere.charCodeAt(i)) % PALETTE.length;
  return PALETTE[h];
}

// Répartit les cours qui se chevauchent en colonnes côte à côte pour un jour donné
function repartirColonnes(coursDuJour) {
  const tries = [...coursDuJour].sort((a, b) => a.debut - b.debut);
  const colonnes = []; // fin de chaque colonne active
  const placements = [];

  for (const c of tries) {
    let col = colonnes.findIndex((finCol) => finCol <= c.debut);
    if (col === -1) {
      col = colonnes.length;
    }
    colonnes[col] = c.fin;
    placements.push({ cours: c, colonne: col });
  }

  const nbColonnes = colonnes.length || 1;
  return placements.map((p) => ({ ...p, nbColonnes }));
}

export default function EDT() {
  const { user } = useAuth();
  const [cours, setCours] = useState([]);
  const [semaineOffset, setSemaineOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ matiere: "", dateDebut: "", dateFin: "", salle: "", prof: "" });

  useEffect(() => {
    api.get("/edt").then((res) => setCours(res.data));
  }, []);

  const lundi = useMemo(() => {
    const base = lundiDeLaSemaine(new Date());
    base.setDate(base.getDate() + semaineOffset * 7);
    return base;
  }, [semaineOffset]);

  const jours = useMemo(
    () =>
      NOMS_JOURS.map((nom, i) => {
        const date = new Date(lundi);
        date.setDate(date.getDate() + i);
        return { nom, date };
      }),
    [lundi]
  );

  // Cours de la semaine affichée, avec leurs bornes en Date + minutes
  const coursParJour = useMemo(() => {
    return jours.map(({ date }) => {
      const duJour = cours
        .filter((c) => memeJour(new Date(c.dateDebut), date))
        .map((c) => {
          const debutDate = new Date(c.dateDebut);
          const finDate = new Date(c.dateFin);
          return {
            ...c,
            debutDate,
            finDate,
            debut: minutesDepuisMinuit(debutDate),
            fin: Math.max(minutesDepuisMinuit(finDate), minutesDepuisMinuit(debutDate) + 15),
          };
        });
      return repartirColonnes(duJour);
    });
  }, [cours, jours]);

  // Plage horaire affichée : englobe tous les cours de la semaine, avec un minimum raisonnable
  const { heureDebutGrille, heureFinGrille } = useMemo(() => {
    const toutesMinutes = coursParJour.flat().flatMap((p) => [p.cours.debut, p.cours.fin]);
    if (toutesMinutes.length === 0) {
      return { heureDebutGrille: HEURE_MIN_DEFAUT, heureFinGrille: HEURE_MAX_DEFAUT };
    }
    const min = Math.min(HEURE_MIN_DEFAUT * 60, ...toutesMinutes);
    const max = Math.max(HEURE_MAX_DEFAUT * 60, ...toutesMinutes);
    return { heureDebutGrille: Math.floor(min / 60), heureFinGrille: Math.ceil(max / 60) };
  }, [coursParJour]);

  const heures = useMemo(() => {
    const liste = [];
    for (let h = heureDebutGrille; h < heureFinGrille; h++) liste.push(h);
    return liste;
  }, [heureDebutGrille, heureFinGrille]);

  const hauteurGrille = (heureFinGrille - heureDebutGrille) * HAUTEUR_HEURE;

  function positionBloc(c) {
    const minutesGrille = (heureFinGrille - heureDebutGrille) * 60;
    const top = ((c.debut - heureDebutGrille * 60) / minutesGrille) * hauteurGrille;
    const hauteur = ((c.fin - c.debut) / minutesGrille) * hauteurGrille;
    return { top, hauteur };
  }

  const maintenant = new Date();
  const minutesMaintenant = minutesDepuisMinuit(maintenant);
  const ligneMaintenantTop =
    ((minutesMaintenant - heureDebutGrille * 60) / ((heureFinGrille - heureDebutGrille) * 60)) * hauteurGrille;
  const afficherLigneMaintenant =
    semaineOffset === 0 && minutesMaintenant >= heureDebutGrille * 60 && minutesMaintenant <= heureFinGrille * 60;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post("/edt", form);
    setCours([...cours, data]);
    setForm({ matiere: "", dateDebut: "", dateFin: "", salle: "", prof: "" });
    setShowForm(false);
  }

  async function handleDelete(id) {
    await api.delete(`/edt/${id}`);
    setCours(cours.filter((c) => c.id !== id));
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <PageTitle>Emploi du temps</PageTitle>
          {user?.role === "admin" && (
            <button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Annuler" : "+ Ajouter un cours"}
            </button>
          )}
        </div>

        <div className={styles.weekNav}>
          <button type="button" onClick={() => setSemaineOffset(semaineOffset - 1)}>
            ← Précédente
          </button>
          <span className={styles.weekLabel}>
            Semaine du {lundi.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            {semaineOffset !== 0 && (
              <button type="button" className={styles.today} onClick={() => setSemaineOffset(0)}>
                Revenir à aujourd'hui
              </button>
            )}
          </span>
          <button type="button" onClick={() => setSemaineOffset(semaineOffset + 1)}>
            Suivante →
          </button>
        </div>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              name="matiere"
              placeholder="Matière"
              value={form.matiere}
              onChange={handleChange}
              required
            />
            <div className={styles.row}>
              <input
                name="dateDebut"
                type="datetime-local"
                value={form.dateDebut}
                onChange={handleChange}
                required
              />
              <input
                name="dateFin"
                type="datetime-local"
                value={form.dateFin}
                onChange={handleChange}
                required
              />
            </div>
            <input name="salle" placeholder="Salle (optionnel)" value={form.salle} onChange={handleChange} />
            <input
              name="prof"
              placeholder="Professeur (optionnel)"
              value={form.prof}
              onChange={handleChange}
            />
            <button type="submit">Ajouter</button>
          </form>
        )}

        <div className={styles.timetable}>
          <div className={styles.corner} />
          {jours.map(({ nom, date }) => (
            <div key={nom} className={`${styles.dayHeader} ${memeJour(date, maintenant) ? styles.dayHeaderToday : ""}`}>
              <span className={styles.dayName}>{nom}</span>
              <span className={styles.dayNum}>{date.getDate()}</span>
            </div>
          ))}

          <div className={styles.timeAxis} style={{ height: hauteurGrille }}>
            {heures.map((h) => (
              <div key={h} className={styles.timeLabel} style={{ height: HAUTEUR_HEURE }}>
                {h}h
              </div>
            ))}
          </div>

          {jours.map(({ date }, i) => (
            <div key={i} className={styles.dayColumn} style={{ height: hauteurGrille }}>
              {heures.map((h) => (
                <div key={h} className={styles.hourLine} style={{ height: HAUTEUR_HEURE }} />
              ))}

              {memeJour(date, maintenant) && afficherLigneMaintenant && (
                <div className={styles.nowLine} style={{ top: ligneMaintenantTop }} />
              )}

              {coursParJour[i].map(({ cours: c, colonne, nbColonnes }) => {
                const { top, hauteur } = positionBloc(c);
                const largeur = 100 / nbColonnes;
                return (
                  <div
                    key={c.id}
                    className={`${styles.bloc} ${styles["couleur-" + couleurMatiere(c.matiere)]} ${c.annule ? styles.blocAnnule : ""}`}
                    style={{
                      top,
                      height: Math.max(hauteur, 22),
                      left: `${colonne * largeur}%`,
                      width: `calc(${largeur}% - 4px)`,
                    }}
                    title={`${c.matiere} · ${formatHeure(c.debutDate)}–${formatHeure(c.finDate)}${c.salle ? " · " + c.salle : ""}`}
                  >
                    <span className={styles.blocHeure}>
                      {formatHeure(c.debutDate)}–{formatHeure(c.finDate)}
                      {c.annule && <span className={styles.badgeAnnule}>Annulé</span>}
                    </span>
                    <span className={styles.blocMatiere}>{c.matiere}</span>
                    {c.salle && <span className={styles.blocMeta}>{c.salle}</span>}
                    {c.prof && <span className={styles.blocMeta}>{c.prof}</span>}
                    {user?.role === "admin" && (
                      <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
