import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../api/index.js";
import styles from "./Notes.module.css";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ matiere: "", valeur: "", coefficient: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get("/notes").then(res => setNotes(res.data));
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post("/notes", form);
    setNotes([data, ...notes]);
    setForm({ matiere: "", valeur: "", coefficient: "" });
    setShowForm(false);
  }

  async function handleDelete(id) {
    await api.delete(`/notes/${id}`);
    setNotes(notes.filter(n => n.id !== id));
  }

  const moyenne = notes.length === 0 ? null : (
    notes.reduce((acc, n) => acc + n.valeur * n.coefficient, 0) /
    notes.reduce((acc, n) => acc + n.coefficient, 0)
  ).toFixed(2);

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Mes notes</h1>
            {moyenne && <p className={styles.moyenne}>Moyenne générale : <strong>{moyenne}/20</strong></p>}
          </div>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Annuler" : "+ Ajouter"}
          </button>
        </div>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input name="matiere" placeholder="Matière" value={form.matiere} onChange={handleChange} required />
            <input name="valeur" type="number" min="0" max="20" step="0.5" placeholder="Note /20" value={form.valeur} onChange={handleChange} required />
            <input name="coefficient" type="number" min="0.5" step="0.5" placeholder="Coefficient" value={form.coefficient} onChange={handleChange} />
            <button type="submit">Ajouter la note</button>
          </form>
        )}

        <div className={styles.list}>
          {notes.length === 0 && <p className={styles.empty}>Aucune note enregistrée.</p>}
          {notes.map(note => (
            <div key={note.id} className={styles.card}>
              <div className={styles.cardLeft}>
                <span className={styles.matiere}>{note.matiere}</span>
                <span className={styles.coef}>Coef. {note.coefficient}</span>
              </div>
              <div className={styles.cardRight}>
                <span className={styles.valeur}>{note.valeur}/20</span>
                <button className={styles.deleteBtn} onClick={() => handleDelete(note.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
