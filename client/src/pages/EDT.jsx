import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import api from "../api/index.js";
import styles from "./EDT.module.css";

const NOMS_JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

// Lundi de la semaine contenant `date`
function lundiDeLaSemaine(date) {
  const d = new Date(date);
  const jour = d.getDay(); // 0 = dimanche
  const decalage = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + decalage);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatHeure(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function memeJour(iso, date) {
  const a = new Date(iso);
  return a.getFullYear() === date.getFullYear() && a.getMonth() === date.getMonth() && a.getDate() === date.getDate();
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
            ← Semaine précédente
          </button>
          <span className={styles.weekLabel}>
            {lundi.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            {semaineOffset !== 0 && (
              <button type="button" className={styles.today} onClick={() => setSemaineOffset(0)}>
                Revenir à aujourd'hui
              </button>
            )}
          </span>
          <button type="button" onClick={() => setSemaineOffset(semaineOffset + 1)}>
            Semaine suivante →
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

        <div className={styles.grid}>
          {jours.map(({ nom, date }) => {
            const coursDuJour = cours
              .filter((c) => memeJour(c.dateDebut, date))
              .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut));
            return (
              <div key={nom} className={styles.day}>
                <h3 className={styles.dayTitle}>
                  {nom} {date.getDate()}
                </h3>
                {coursDuJour.length === 0 && <p className={styles.empty}>—</p>}
                {coursDuJour.map((c) => (
                  <div key={c.id} className={`${styles.cours} ${c.annule ? styles.coursAnnule : ""}`}>
                    <div className={styles.coursTime}>
                      {formatHeure(c.dateDebut)} – {formatHeure(c.dateFin)}
                      {c.annule && <span className={styles.badgeAnnule}>Annulé</span>}
                    </div>
                    <div className={styles.coursMatiere}>{c.matiere}</div>
                    {c.salle && <div className={styles.coursMeta}>{c.salle}</div>}
                    {c.prof && <div className={styles.coursMeta}>{c.prof}</div>}
                    {user?.role === "admin" && (
                      <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
