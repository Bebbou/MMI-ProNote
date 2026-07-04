import { useState, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/index.js";
import styles from "./Widget.module.css";

export default function DevoirsWidget() {
  const { user } = useAuth();
  const [devoirs, setDevoirs] = useState([]);
  const [form, setForm] = useState({ titre: "", matiere: "", dateLimite: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get("/devoirs").then(res => setDevoirs(res.data));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post("/devoirs", form);
    setDevoirs(prev => [...prev, data]);
    setForm({ titre: "", matiere: "", dateLimite: "" });
    setShowForm(false);
  }

  async function handleDelete(id) {
    await api.delete(`/devoirs/${id}`);
    setDevoirs(prev => prev.filter(d => d.id !== id));
  }

  const canCreate = user?.role === "admin" || user?.role === "delegue";

  return (
    <div className={styles.widget}>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className={styles.header}>
        <BookOpen size={14} strokeWidth={1.5} className={styles.icon} />
        <h3>Devoirs à venir</h3>
        {canCreate && (
          <button className={styles.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕" : "+"}
          </button>
        )}
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <input className={styles.input} placeholder="Titre" value={form.titre}
            onChange={e => setForm({ ...form, titre: e.target.value })} required />
          <input className={styles.input} placeholder="Matière" value={form.matiere}
            onChange={e => setForm({ ...form, matiere: e.target.value })} required />
          <input className={styles.input} type="datetime-local" value={form.dateLimite}
            onChange={e => setForm({ ...form, dateLimite: e.target.value })} required />
          <button className={styles.submitBtn} type="submit">Ajouter</button>
        </form>
      )}

      <div className={styles.list}>
        {devoirs.length === 0 && <p className={styles.empty}>Aucun devoir</p>}
        {devoirs.map(d => (
          <div key={d.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.tag}>{d.matiere}</span>
              <span className={styles.itemTitle}>{d.titre}</span>
              <span className={styles.itemDate}>
                {new Date(d.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
            </div>
            {canCreate && (
              <button className={styles.deleteBtn} onClick={() => handleDelete(d.id)}>✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
