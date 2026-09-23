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

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

// Le badge rouge "En retard" ne reste affiché que 24h après l'échéance : passé ce délai,
// un signal d'alerte qui ne disparaît jamais perd son sens (issue #36). Le devoir reste
// visible dans "À rendre" tant qu'il n'est pas coché, juste sans l'alerte visuelle.
function estRecemmentEnRetard(devoir, maintenant) {
  if (devoir.rendu) return false;
  const retardMs = maintenant - new Date(devoir.dateLimite);
  return retardMs > 0 && retardMs < UN_JOUR_MS;
}

// Convertit une date ISO (UTC) en chaîne compatible <input type="datetime-local">,
// dans le fuseau du navigateur (donc le bon fuseau, celui de l'utilisateur)
function versDatetimeLocal(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Devoirs() {
  const { user } = useAuth();
  const socket = useSocket();
  const [devoirs, setDevoirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ titre: "", matiere: "", description: "", dateLimite: "" });
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [editingDevoir, setEditingDevoir] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [onglet, setOnglet] = useState("aRendre"); // "aRendre" | "historique"
  // Devoirs qu'on vient de (dé)cocher et qui vont quitter la vue actuelle : encore
  // affichés le temps de l'animation de sortie avant de disparaître pour de bon (sinon
  // la carte disparaît d'un coup). Clés au format "onglet-id" pour ne pas appliquer
  // l'animation dans le mauvais onglet si l'utilisateur change de vue entre-temps.
  const [sortants, setSortants] = useState(new Set());

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

    // Le serveur ne renvoie pas "rendu" (c'est un état personnel, propre à chaque
    // utilisateur) : on fusionne pour ne jamais écraser sa propre coche
    socket.on("devoirModifie", (devoir) => {
      setDevoirs((prev) => prev.map((d) => (d.id === devoir.id ? { ...d, ...devoir } : d)));
    });

    return () => {
      socket.off("nouveauDevoir");
      socket.off("devoirSupprime");
      socket.off("devoirModifie");
    };
  }, [socket]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      // <input type="datetime-local"> renvoie une heure "nue" sans fuseau ; on la
      // convertit en UTC explicite dans le fuseau du navigateur avant l'envoi, sinon
      // le serveur (en UTC sur Railway) la prend à tort pour de l'UTC (issue #44).
      const { data } = await api.post("/devoirs", {
        ...form,
        dateLimite: new Date(form.dateLimite).toISOString(),
      });
      setDevoirs([...devoirs, data]);
      setForm({ titre: "", matiere: "", description: "", dateLimite: "" });
      setShowForm(false);
      toast("Devoir cree");
    } catch {
      toast("Impossible de creer le devoir", "error");
    }
  }

  function openEditDevoir(devoir) {
    setEditingDevoir(devoir);
    setEditForm({
      titre: devoir.titre,
      matiere: devoir.matiere,
      description: devoir.description ?? "",
      dateLimite: versDatetimeLocal(devoir.dateLimite),
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.patch(`/devoirs/${editingDevoir.id}`, {
        ...editForm,
        dateLimite: new Date(editForm.dateLimite).toISOString(),
      });
      setDevoirs((prev) => prev.map((d) => (d.id === data.id ? { ...d, ...data } : d)));
      setEditingDevoir(null);
      toast("Devoir modifié");
    } catch {
      toast("Impossible de modifier le devoir", "error");
    }
  }

  async function handleToggleRendu(devoir) {
    const nouvelEtat = !devoir.rendu;

    // La carte va-t-elle quitter la vue actuellement affichée ? Cocher dans "À rendre",
    // ou décocher dans "Historique" (sauf si le devoir reste dans l'historique parce
    // qu'il est de toute façon dépassé — dans ce cas rien ne change à l'affichage).
    const vaQuitterVueActuelle =
      (onglet === "aRendre" && nouvelEtat) ||
      (onglet === "historique" && !nouvelEtat && new Date(devoir.dateLimite) >= now);

    if (vaQuitterVueActuelle) {
      // Clé incluant l'onglet : si l'utilisateur change d'onglet avant la fin de
      // l'animation, on ne doit pas appliquer à tort le style "sortant" dans l'autre
      // onglet, où la carte est censée s'afficher normalement.
      const cle = `${onglet}-${devoir.id}`;
      setSortants((prev) => new Set(prev).add(cle));
      setTimeout(() => {
        setSortants((prev) => {
          const next = new Set(prev);
          next.delete(cle);
          return next;
        });
      }, 450);
    }

    // Optimiste : on bascule tout de suite dans l'UI, on annule si le serveur refuse
    setDevoirs((prev) => prev.map((d) => (d.id === devoir.id ? { ...d, rendu: nouvelEtat } : d)));
    try {
      await api.post(`/devoirs/${devoir.id}/rendu`);
    } catch {
      setDevoirs((prev) => prev.map((d) => (d.id === devoir.id ? { ...d, rendu: devoir.rendu } : d)));
      toast("Impossible de mettre à jour le devoir", "error");
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

  // "Historique" ne doit montrer que ce qui appartient vraiment au passé : un devoir
  // rendu (peu importe la date), ou un devoir dont l'échéance est dépassée. Un devoir
  // à venir et pas encore rendu n'a rien à faire ici, il reste dans "À rendre" (issue #42).
  const devoirsAffiches =
    onglet === "aRendre"
      ? devoirs.filter((d) => !d.rendu || sortants.has(`aRendre-${d.id}`))
      : devoirs
          .filter((d) => d.rendu || new Date(d.dateLimite) < now || sortants.has(`historique-${d.id}`))
          .sort((a, b) => new Date(b.dateLimite) - new Date(a.dateLimite));

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <PageTitle>Devoirs</PageTitle>
          {canCreate && (
            <button onClick={() => setShowForm(!showForm)}>{showForm ? "Annuler" : "+ Ajouter"}</button>
          )}
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${onglet === "aRendre" ? styles.tabActive : ""}`}
            onClick={() => setOnglet("aRendre")}
          >
            À rendre
          </button>
          <button
            className={`${styles.tab} ${onglet === "historique" ? styles.tabActive : ""}`}
            onClick={() => setOnglet("historique")}
          >
            Historique
          </button>
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
            {devoirsAffiches.length === 0 && (
              <p className={styles.empty}>
                {onglet === "aRendre" ? "Rien à rendre pour l'instant" : "Aucun devoir pour l'instant"}
              </p>
            )}
            {devoirsAffiches.map((devoir) => {
              const enRetard = estRecemmentEnRetard(devoir, now);
              return (
                <div
                  key={devoir.id}
                  className={`${styles.card} ${enRetard ? styles.cardLate : ""} ${devoir.rendu ? styles.cardRendu : ""} ${sortants.has(`${onglet}-${devoir.id}`) ? styles.cardSortant : ""}`}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.matiere}>{devoir.matiere}</span>
                    <span className={enRetard ? styles.dateLate : styles.date}>
                      {enRetard && <span className={styles.lateBadge}>En retard</span>}
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
                    <label className={styles.renduCheck}>
                      <input
                        type="checkbox"
                        checked={!!devoir.rendu}
                        onChange={() => handleToggleRendu(devoir)}
                      />
                      {devoir.rendu ? "Rendu" : "J'ai rendu ce devoir"}
                    </label>
                    <div className={styles.cardFooterRight}>
                      <span className={styles.auteur}>Ajouté par {devoir.auteur?.nom}</span>
                      {canCreate && (
                        <button className={styles.editBtn} onClick={() => openEditDevoir(devoir)}>
                          Modifier
                        </button>
                      )}
                      {canCreate && (
                        <button className={styles.deleteBtn} onClick={() => setToDelete(devoir.id)}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingDevoir && (
        <div className={styles.editOverlay} onClick={() => setEditingDevoir(null)}>
          <form className={styles.editModal} onClick={(e) => e.stopPropagation()} onSubmit={handleEditSubmit}>
            <h2 className={styles.editModalTitle}>Modifier le devoir</h2>
            <input
              placeholder="Titre"
              value={editForm.titre}
              onChange={(e) => setEditForm({ ...editForm, titre: e.target.value })}
              required
            />
            <input
              placeholder="Matière"
              value={editForm.matiere}
              onChange={(e) => setEditForm({ ...editForm, matiere: e.target.value })}
              required
            />
            <input
              placeholder="Description (optionnel)"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <label className={styles.dateLabel}>
              Date limite
              <input
                type="datetime-local"
                value={editForm.dateLimite}
                onChange={(e) => setEditForm({ ...editForm, dateLimite: e.target.value })}
                required
              />
            </label>
            <div className={styles.editModalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setEditingDevoir(null)}>
                Annuler
              </button>
              <button type="submit">Enregistrer</button>
            </div>
          </form>
        </div>
      )}

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
