import { useState, useEffect, useCallback } from "react";
import { Plus, X } from "lucide-react";
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
    api
      .get("/notes")
      .then((res) => setNotes(res.data))
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
      const { data } = await api.post("/notes", { ...form, coefficient: form.coefficient || 1 });
      setNotes([data, ...notes]);
      setForm({ matiere: "", valeur: "", coefficient: "" });
      setShowForm(false);
      toast("Note ajoutée");
    } catch (err) {
      toast(err.response?.data?.error || "Impossible d'ajouter la note", "error");
    }
  }

  async function confirmDelete() {
    const id = toDelete;
    setToDelete(null);
    try {
      await api.delete(`/notes/${id}`);
      setNotes(notes.filter((n) => n.id !== id));
      toast("Note supprimée");
    } catch {
      toast("Impossible de supprimer la note", "error");
    }
  }

  // Même calcul que NotesWidget : sans coefficient positif, pas de moyenne (évite "NaN/20")
  const totalCoef = notes.reduce((acc, n) => acc + n.coefficient, 0);
  const moyenne =
    totalCoef > 0 ? (notes.reduce((acc, n) => acc + n.valeur * n.coefficient, 0) / totalCoef).toFixed(2) : null;

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <PageTitle>Mes notes</PageTitle>
            {moyenne && (
              <p className={styles.moyenne}>
                Moyenne générale : <strong>{moyenne}/20</strong>
              </p>
            )}
          </div>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
            {showForm ? "Annuler" : "Ajouter une note"}
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
            <input
              name="valeur"
              type="number"
              min="0"
              max="20"
              step="0.5"
              placeholder="Note /20"
              value={form.valeur}
              onChange={handleChange}
              required
            />
            <input
              name="coefficient"
              type="number"
              min="0.5"
              max="100"
              step="0.5"
              placeholder="Coefficient (1 par défaut)"
              value={form.coefficient}
              onChange={handleChange}
            />
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
            {notes.map((note) => (
              <div key={note.id} className={styles.card}>
                <div className={styles.cardLeft}>
                  <span className={styles.matiere}>{note.matiere}</span>
                  <span className={styles.coef}>Coef. {note.coefficient}</span>
                </div>
                <div className={styles.cardRight}>
                  <span className={styles.valeur}>{note.valeur}/20</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setToDelete(note.id)}
                    aria-label={`Supprimer la note de ${note.matiere}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={toDelete !== null}
        title="Supprimer cette note ?"
        message="Cette action est définitive."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Layout>
  );
}
