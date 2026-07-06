import { useState, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { BarChart2 } from "lucide-react";
import api from "../api/index.js";
import styles from "./Widget.module.css";

export default function NotesWidget() {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({ matiere: "", valeur: "", coefficient: "1" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get("/notes").then((res) => setNotes(res.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post("/notes", form);
    setNotes((prev) => [data, ...prev]);
    setForm({ matiere: "", valeur: "", coefficient: "1" });
    setShowForm(false);
  }

  async function handleDelete(id) {
    await api.delete(`/notes/${id}`);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  const moyenne =
    notes.length === 0
      ? null
      : (
          notes.reduce((acc, n) => acc + n.valeur * n.coefficient, 0) /
          notes.reduce((acc, n) => acc + n.coefficient, 0)
        ).toFixed(2);

  return (
    <div className={styles.widget}>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className={styles.header}>
        <BarChart2 size={14} strokeWidth={1.5} className={styles.icon} />
        <h3>Mes notes {moyenne && <span className={styles.moyenne}>— {moyenne}/20</span>}</h3>
        <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕" : "+"}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            placeholder="Matière"
            value={form.matiere}
            onChange={(e) => setForm({ ...form, matiere: e.target.value })}
            required
          />
          <input
            className={styles.input}
            type="number"
            min="0"
            max="20"
            step="0.5"
            placeholder="Note /20"
            value={form.valeur}
            onChange={(e) => setForm({ ...form, valeur: e.target.value })}
            required
          />
          <input
            className={styles.input}
            type="number"
            min="0.5"
            step="0.5"
            placeholder="Coefficient"
            value={form.coefficient}
            onChange={(e) => setForm({ ...form, coefficient: e.target.value })}
          />
          <button className={styles.submitBtn} type="submit">
            Ajouter
          </button>
        </form>
      )}

      <div className={styles.list}>
        {notes.length === 0 && <p className={styles.empty}>Aucune note enregistrée.</p>}
        {notes.map((n) => (
          <div key={n.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.itemTitle}>{n.matiere}</span>
              <span className={styles.tag}>coef. {n.coefficient}</span>
              <span className={styles.noteValeur}>{n.valeur}/20</span>
            </div>
            <button className={styles.deleteBtn} onClick={() => handleDelete(n.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
