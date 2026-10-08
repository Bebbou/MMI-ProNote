import { useState, useEffect, useCallback } from "react";
import { Plus, X, Pencil, Trash2, MessageSquare, ChevronDown, ChevronUp, Send } from "lucide-react";
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

const TYPES = [
  { id: "Devoir", label: "Devoir" },
  { id: "Evaluation", label: "Évaluation" },
];

const FORM_VIDE = { titre: "", matiere: "", description: "", dateLimite: "", type: "Devoir" };

function formatDateCommentaire(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Devoirs() {
  const { user } = useAuth();
  const socket = useSocket();
  const [devoirs, setDevoirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [editingDevoir, setEditingDevoir] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [onglet, setOnglet] = useState("aRendre"); // "aRendre" | "historique"
  // Filtres de l'"agenda de rendu" (issue #51)
  const [filtreType, setFiltreType] = useState("Tous");
  const [filtreMatiere, setFiltreMatiere] = useState("Toutes");
  // Commentaires : un seul devoir déplié à la fois, chargés à la demande
  const [expandedId, setExpandedId] = useState(null);
  const [commentaires, setCommentaires] = useState({});
  const [commentInput, setCommentInput] = useState({});
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
      setForm(FORM_VIDE);
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
      type: devoir.type ?? "Devoir",
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

  function ajusterCompteur(devoirId, delta) {
    setDevoirs((prev) =>
      prev.map((d) =>
        d.id === devoirId
          ? { ...d, _count: { commentaires: Math.max(0, (d._count?.commentaires || 0) + delta) } }
          : d
      )
    );
  }

  async function toggleComments(devoirId) {
    if (expandedId === devoirId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(devoirId);
    if (commentaires[devoirId]) return;
    try {
      const { data } = await api.get(`/devoirs/${devoirId}/commentaires`);
      setCommentaires((prev) => ({ ...prev, [devoirId]: data }));
    } catch {
      setExpandedId(null);
      toast("Impossible de charger les commentaires", "error");
    }
  }

  async function sendComment(devoirId) {
    const content = commentInput[devoirId]?.trim();
    if (!content) return;
    try {
      const { data } = await api.post(`/devoirs/${devoirId}/commentaires`, { content });
      setCommentaires((prev) => ({ ...prev, [devoirId]: [...(prev[devoirId] || []), data] }));
      setCommentInput((prev) => ({ ...prev, [devoirId]: "" }));
      ajusterCompteur(devoirId, 1);
    } catch {
      toast("Impossible d'envoyer le commentaire", "error");
    }
  }

  async function deleteComment(devoirId, commentId) {
    try {
      await api.delete(`/devoirs/commentaires/${commentId}`);
      setCommentaires((prev) => ({ ...prev, [devoirId]: prev[devoirId].filter((c) => c.id !== commentId) }));
      ajusterCompteur(devoirId, -1);
    } catch {
      toast("Impossible de supprimer le commentaire", "error");
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
  const devoirsDeLOnglet =
    onglet === "aRendre"
      ? devoirs.filter((d) => !d.rendu || sortants.has(`aRendre-${d.id}`))
      : devoirs
          .filter((d) => d.rendu || new Date(d.dateLimite) < now || sortants.has(`historique-${d.id}`))
          .sort((a, b) => new Date(b.dateLimite) - new Date(a.dateLimite));

  // Compteurs et matières suivent l'onglet courant : un filtre ne doit jamais proposer
  // une valeur qui donnerait une liste vide
  const nbParType = (type) => devoirsDeLOnglet.filter((d) => d.type === type).length;
  const matieres = ["Toutes", ...Array.from(new Set(devoirsDeLOnglet.map((d) => d.matiere))).sort()];

  // Si la matière choisie n'existe plus dans cet onglet, on retombe sur "Toutes"
  const matiereActive = matieres.includes(filtreMatiere) ? filtreMatiere : "Toutes";

  const devoirsAffiches = devoirsDeLOnglet
    .filter((d) => filtreType === "Tous" || d.type === filtreType)
    .filter((d) => matiereActive === "Toutes" || d.matiere === matiereActive);

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <PageTitle>Devoirs</PageTitle>
          {canCreate && (
            <button onClick={() => setShowForm(!showForm)}>
              {showForm ? <X size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
              {showForm ? "Annuler" : "Ajouter un devoir"}
            </button>
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

        {/* Agenda de rendu : filtre par type puis par matière (issue #51) */}
        <div className={styles.filters}>
          <button
            className={`${styles.filterBtn} ${filtreType === "Tous" ? styles.filterActive : ""}`}
            onClick={() => setFiltreType("Tous")}
          >
            Tout <span className={styles.filterCount}>{devoirsDeLOnglet.length}</span>
          </button>
          {TYPES.map((t) => (
            <button
              key={t.id}
              className={`${styles.filterBtn} ${filtreType === t.id ? styles.filterActive : ""}`}
              onClick={() => setFiltreType(t.id)}
            >
              {t.label}s <span className={styles.filterCount}>{nbParType(t.id)}</span>
            </button>
          ))}
        </div>
        {matieres.length > 2 && (
          <div className={styles.filters}>
            {matieres.map((m) => (
              <button
                key={m}
                className={`${styles.filterBtn} ${styles.filterBtnMatiere} ${matiereActive === m ? styles.filterActive : ""}`}
                onClick={() => setFiltreMatiere(m)}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h2 className={styles.formTitle}>Nouveau devoir</h2>
            <select name="type" value={form.type} onChange={handleChange}>
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <input name="titre" placeholder="Titre" value={form.titre} onChange={handleChange} required />
            <input
              name="matiere"
              placeholder="Matière"
              value={form.matiere}
              onChange={handleChange}
              required
            />
            <textarea
              name="description"
              placeholder="Consignes / description (optionnel)"
              rows={4}
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
                {devoirsDeLOnglet.length > 0
                  ? "Aucun résultat avec ces filtres"
                  : onglet === "aRendre"
                    ? "Rien à rendre pour l'instant"
                    : "Aucun devoir pour l'instant"}
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
                    <div className={styles.badges}>
                      <span className={styles.matiere}>{devoir.matiere}</span>
                      {devoir.type === "Evaluation" && <span className={styles.evalBadge}>Évaluation</span>}
                    </div>
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
                  {devoir.description && <p className={styles.consignes}>{devoir.description}</p>}
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
                      <button
                        className={styles.commentToggle}
                        onClick={() => toggleComments(devoir.id)}
                        title="Commentaires"
                      >
                        <MessageSquare size={15} strokeWidth={1.5} />
                        <span>{devoir._count?.commentaires || 0}</span>
                        {expandedId === devoir.id ? (
                          <ChevronUp size={13} strokeWidth={1.5} />
                        ) : (
                          <ChevronDown size={13} strokeWidth={1.5} />
                        )}
                      </button>
                      {canCreate && (
                        <button
                          className={styles.editBtn}
                          onClick={() => openEditDevoir(devoir)}
                          title="Modifier"
                        >
                          <Pencil size={14} strokeWidth={1.5} />
                        </button>
                      )}
                      {canCreate && (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => setToDelete(devoir.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedId === devoir.id && (
                    <div className={styles.comments}>
                      <div className={styles.commentsList}>
                        {!commentaires[devoir.id] ? (
                          <p className={styles.commentsEmpty}>Chargement…</p>
                        ) : commentaires[devoir.id].length === 0 ? (
                          <p className={styles.commentsEmpty}>Aucun commentaire. Précisions, questions ?</p>
                        ) : (
                          commentaires[devoir.id].map((c) => (
                            <div key={c.id} className={styles.comment}>
                              <div className={styles.commentHeader}>
                                <span className={styles.commentAuteur}>{c.auteur.nom}</span>
                                {["admin", "delegue"].includes(c.auteur.role) && (
                                  <span className={styles.commentRole}>
                                    {c.auteur.role === "admin" ? "Admin" : "Délégué"}
                                  </span>
                                )}
                                <span className={styles.commentDate}>
                                  {formatDateCommentaire(c.createdAt)}
                                </span>
                                {(canCreate || c.auteur.id === user?.id) && (
                                  <button
                                    className={styles.commentDelete}
                                    onClick={() => deleteComment(devoir.id, c.id)}
                                    title="Supprimer le commentaire"
                                  >
                                    <X size={11} strokeWidth={1.5} />
                                  </button>
                                )}
                              </div>
                              <p className={styles.commentContent}>{c.content}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <form
                        className={styles.commentForm}
                        onSubmit={(e) => {
                          e.preventDefault();
                          sendComment(devoir.id);
                        }}
                      >
                        <input
                          className={styles.commentInput}
                          placeholder="Ajouter un commentaire…"
                          maxLength={1000}
                          value={commentInput[devoir.id] || ""}
                          onChange={(e) =>
                            setCommentInput((prev) => ({ ...prev, [devoir.id]: e.target.value }))
                          }
                        />
                        <button
                          type="submit"
                          className={styles.commentSend}
                          disabled={!commentInput[devoir.id]?.trim()}
                        >
                          <Send size={14} strokeWidth={1.5} />
                        </button>
                      </form>
                    </div>
                  )}
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
            <select
              value={editForm.type}
              onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
            >
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
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
            <textarea
              placeholder="Consignes / description (optionnel)"
              rows={4}
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
