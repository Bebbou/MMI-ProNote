import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import ConfirmModal from "../components/ConfirmModal";
import { SkeletonCards } from "../components/Skeleton";
import { toast } from "../components/Toast";
import api from "../api/index.js";
import styles from "./Devoirs.module.css";

export default function Devoirs() {
  const { user } = useAuth();
  const socket = useSocket();
  const [devoirs, setDevoirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ titre: "", matiere: "", description: "", dateLimite: "" });
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const fetchDevoirs = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api
      .get("/devoirs")
      .then((res) => setDevoirs(res.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDevoirs();
  }, [fetchDevoirs]);

  // Écoute les événements temps réel du serveur
  useEffect(() => {
    if (!socket) return;

    socket.on("nouveauDevoir", (devoir) => {
      setDevoirs((prev) => [...prev, devoir].sort((a, b) => new Date(a.dateLimite) - new Date(b.dateLimite)));
    });

    socket.on("devoirSupprime", ({ id }) => {
      setDevoirs((prev) => prev.filter((d) => d.id !== id));
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
    try {
      const { data } = await api.post("/devoirs", form);
      setDevoirs([...devoirs, data]);
      setForm({ titre: "", matiere: "", description: "", dateLimite: "" });
      setShowForm(false);
      toast("Devoir cree");
    } catch {
      toast("Impossible de creer le devoir", "error");
    }
  }

  async function confirmDelete() {
    const id = toDelete;
    setToDelete(null);
    try {
      await api.delete(`/devoirs/${id}`);
      setDevoirs(devoirs.filter((d) => d.id !== id));
      toast("Devoir supprime");
    } catch {
      toast("Impossible de supprimer le devoir", "error");
    }
  }

  const canCreate = user?.role === "admin" || user?.role === "delegue";
  const now = new Date();

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <PageTitle>Devoirs à venir</PageTitle>
          {canCreate && (
            <button onClick={() => setShowForm(!showForm)}>{showForm ? "Annuler" : "+ Ajouter"}</button>
          )}
        </div>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input name="titre" placeholder="Titre" value={form.titre} onChange={handleChange} required />
            <input
              name="matiere"
              placeholder="Matière"
              value={form.matiere}
              onChange={handleChange}
              required
            />
            <input
              name="description"
              placeholder="Description (optionnel)"
              value={form.description}
              onChange={handleChange}
            />
            <label className={styles.dateLabel}>
              Date limite
              <input
                name="dateLimite"
                type="datetime-local"
                value={form.dateLimite}
                onChange={handleChange}
                required
              />
            </label>
            <button type="submit">Créer le devoir</button>
          </form>
        )}

        {loading && <SkeletonCards count={3} height={100} />}

        {loadError && !loading && (
          <div className={styles.loadError}>
            <p>Impossible de charger les devoirs.</p>
            <button onClick={fetchDevoirs}>Réessayer</button>
          </div>
        )}

        {!loading && !loadError && (
          <div className={styles.list}>
            {devoirs.length === 0 && <p className={styles.empty}>Aucun devoir à venir</p>}
            {devoirs.map((devoir) => {
              const isLate = new Date(devoir.dateLimite) < now;
              return (
                <div key={devoir.id} className={`${styles.card} ${isLate ? styles.cardLate : ""}`}>
                  <div className={styles.cardHeader}>
                    <span className={styles.matiere}>{devoir.matiere}</span>
                    <span className={isLate ? styles.dateLate : styles.date}>
                      {isLate && <span className={styles.lateBadge}>En retard</span>}
                      {new Date(devoir.dateLimite).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <h3>{devoir.titre}</h3>
                  {devoir.description && <p>{devoir.description}</p>}
                  <div className={styles.cardFooter}>
                    <span className={styles.auteur}>Ajouté par {devoir.auteur?.nom}</span>
                    {canCreate && (
                      <button className={styles.deleteBtn} onClick={() => setToDelete(devoir.id)}>
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={toDelete !== null}
        title="Supprimer ce devoir ?"
        message="Cette action est definitive."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Layout>
  );
}
