import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import MmiDecor from "../components/MmiDecor";
import api from "../api/index.js";
import styles from "./EDT.module.css";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

export default function EDT() {
  const { user } = useAuth();
  const [cours, setCours] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ matiere: "", jour: "Lundi", heureDebut: "", heureFin: "", salle: "", prof: "" });

  useEffect(() => {
    api.get("/edt").then(res => setCours(res.data));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post("/edt", form);
    setCours([...cours, data]);
    setForm({ matiere: "", jour: "Lundi", heureDebut: "", heureFin: "", salle: "", prof: "" });
    setShowForm(false);
  }

  async function handleDelete(id) {
    await api.delete(`/edt/${id}`);
    setCours(cours.filter(c => c.id !== id));
  }

  return (
    <Layout>
      <div className={styles.page}>
        <MmiDecor />
        <div className={styles.header}>
          <h1>Emploi du temps</h1>
          {user?.role === "admin" && (
            <button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Annuler" : "+ Ajouter un cours"}
            </button>
          )}
        </div>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input name="matiere" placeholder="MatiÃ¨re" value={form.matiere} onChange={handleChange} required />
            <select name="jour" value={form.jour} onChange={handleChange}>
              {JOURS.map(j => <option key={j}>{j}</option>)}
            </select>
            <div className={styles.row}>
              <input name="heureDebut" type="time" value={form.heureDebut} onChange={handleChange} required />
              <input name="heureFin" type="time" value={form.heureFin} onChange={handleChange} required />
            </div>
            <input name="salle" placeholder="Salle (optionnel)" value={form.salle} onChange={handleChange} />
            <input name="prof" placeholder="Professeur (optionnel)" value={form.prof} onChange={handleChange} />
            <button type="submit">Ajouter</button>
          </form>
        )}

        <div className={styles.grid}>
          {JOURS.map(jour => {
            const coursDuJour = cours.filter(c => c.jour === jour);
            return (
              <div key={jour} className={styles.day}>
                <h3 className={styles.dayTitle}>{jour}</h3>
                {coursDuJour.length === 0 && <p className={styles.empty}>â€”</p>}
                {coursDuJour.map(c => (
                  <div key={c.id} className={styles.cours}>
                    <div className={styles.coursTime}>{c.heureDebut} â€“ {c.heureFin}</div>
                    <div className={styles.coursMatiere}>{c.matiere}</div>
                    {c.salle && <div className={styles.coursMeta}>{c.salle}</div>}
                    {c.prof && <div className={styles.coursMeta}>{c.prof}</div>}
                    {user?.role === "admin" && (
                      <button className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>âœ•</button>
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


