import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import ConfirmModal from "../components/ConfirmModal";
import { SkeletonCards } from "../components/Skeleton";
import { toast } from "../components/Toast";
import api from "../api/index.js";
import styles from "./Notes.module.css";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ matiere: "", valeur: "", coefficient: "" });
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const fetchNotes = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.get("/notes")
      .then(res => setNotes(res.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/notes", form);
      setNotes([data, ...notes]);
      setForm({ matiere: "", valeur: "", coefficient: "" });
      setShowForm(false);
      toast("Note ajoutee");
    } catch {
      toast("Impossible d'ajouter la note", "error");
    }
  }

  async function confirmDelete() {
    const id = toDelete;
    setToDelete(null);
    try {
      await api.delete(`/notes/${id}`);
      setNotes(notes.filter(n => n.id !== id));
      toast("Note supprimee");
    } catch {
      toast("Impossible de supprimer la note", "error");
    }
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
            <PageTitle>Mes notes</PageTitle>
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

        {loading && <SkeletonCards count={4} height={60} />}

        {loadError && !loading && (
          <div className={styles.loadError}>
            <p>Impossible de charger les notes.</p>
            <button onClick={fetchNotes}>Réessayer</button>
          </div>
        )}

        {!loading && !loadError && (
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
                  <button className={styles.deleteBtn} onClick={() => setToDelete(note.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={toDelete !== null}
        title="Supprimer cette note ?"
        message="Cette action est definitive."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Layout>
  );
}
