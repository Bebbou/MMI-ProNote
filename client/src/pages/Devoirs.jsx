import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import Layout from "../components/Layout";
import api from "../api/index.js";
import styles from "./Devoirs.module.css";

export default function Devoirs() {
  const { user } = useAuth();
  const socket = useSocket();
  const [devoirs, setDevoirs] = useState([]);
  const [form, setForm] = useState({ titre: "", matiere: "", description: "", dateLimite: "" });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get("/devoirs").then(res => setDevoirs(res.data));
  }, []);

  // Écoute les événements temps réel du serveur
  useEffect(() => {
    if (!socket) return;

    socket.on("nouveauDevoir", (devoir) => {
      setDevoirs(prev => [...prev, devoir].sort((a, b) => new Date(a.dateLimite) - new Date(b.dateLimite)));
    });

    socket.on("devoirSupprime", ({ id }) => {
      setDevoirs(prev => prev.filter(d => d.id !== id));
    });

    return () => {
      socket.off("nouveauDevoir");
      socket.off("devoirSupprime");
    };
  }, [socket]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post("/devoirs", form);
    setDevoirs([...devoirs, data]);
    setForm({ titre: "", matiere: "", description: "", dateLimite: "" });
    setShowForm(false);
  }

  async function handleDelete(id) {
    await api.delete(`/devoirs/${id}`);
    setDevoirs(devoirs.filter(d => d.id !== id));
  }

  const canCreate = user?.role === "admin" || user?.role === "delegue";

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Devoirs à venir</h1>
          {canCreate && (
            <button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Annuler" : "+ Ajouter"}
            </button>
          )}
        </div>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input name="titre" placeholder="Titre" value={form.titre} onChange={handleChange} required />
            <input name="matiere" placeholder="Matière" value={form.matiere} onChange={handleChange} required />
            <input name="description" placeholder="Description (optionnel)" value={form.description} onChange={handleChange} />
            <label className={styles.dateLabel}>
              Date limite
              <input name="dateLimite" type="datetime-local" value={form.dateLimite} onChange={handleChange} required />
            </label>
            <button type="submit">Créer le devoir</button>
          </form>
        )}

        <div className={styles.list}>
          {devoirs.length === 0 && <p className={styles.empty}>Aucun devoir à venir 🎉</p>}
          {devoirs.map(devoir => (
            <div key={devoir.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.matiere}>{devoir.matiere}</span>
                <span className={styles.date}>
                  {new Date(devoir.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <h3>{devoir.titre}</h3>
              {devoir.description && <p>{devoir.description}</p>}
              <div className={styles.cardFooter}>
                <span className={styles.auteur}>Ajouté par {devoir.auteur?.nom}</span>
                {canCreate && (
                  <button className={styles.deleteBtn} onClick={() => handleDelete(devoir.id)}>Supprimer</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
