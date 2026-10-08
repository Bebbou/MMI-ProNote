import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  Check,
  Search,
  PartyPopper,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import ConfirmModal from "../components/ConfirmModal";
import { SkeletonCards } from "../components/Skeleton";
import { toast } from "../components/Toast";
import { useOptions } from "../hooks/useOptions";
import api from "../api/index.js";
import { GROUPES, groupeEcheance, urgenceEcheance, libelleEcheance } from "../utils/echeance";
import styles from "./Devoirs.module.css";

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

const FORM_VIDE = { titre: "", matiere: "", description: "", dateLimite: "", type: "Devoir", optionId: "" };

function formatDateCommentaire(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Consignes repliées sur 3 lignes : une longue description ne doit pas pousser les autres
// devoirs hors de l'écran, mais reste lisible en un clic
function Consignes({ texte }) {
  const [ouvert, setOuvert] = useState(false);
  const longue = texte.length > 160 || texte.split("\n").length > 3;

  return (
    <div>
      <p className={`${styles.consignes} ${longue && !ouvert ? styles.consignesReplie : ""}`}>{texte}</p>
      {longue && (
        <button className={styles.voirPlus} onClick={() => setOuvert((v) => !v)}>
          {ouvert ? "Réduire" : "Voir la suite"}
        </button>
      )}
    </div>
  );
}

export default function Devoirs() {
  const { user } = useAuth();
  const socket = useSocket();
  const { options } = useOptions();
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
  const [recherche, setRecherche] = useState("");
  const [filtreAudience, setFiltreAudience] = useState("tous"); // "tous" | "groupe" | id d'option
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
      setDevoirs((prev) =>
        [...prev.filter((d) => d.id !== devoir.id), devoir].sort(
          (a, b) => new Date(a.dateLimite) - new Date(b.dateLimite)
        )
      );
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

  // Échap ferme la modale d'édition
  useEffect(() => {
    if (!editingDevoir) return;
    const onKey = (e) => e.key === "Escape" && setEditingDevoir(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editingDevoir]);

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
        optionId: form.optionId ? Number(form.optionId) : null,
        dateLimite: new Date(form.dateLimite).toISOString(),
      });
      setDevoirs((prev) => [...prev, data].sort((a, b) => new Date(a.dateLimite) - new Date(b.dateLimite)));
      setForm(FORM_VIDE);
      setShowForm(false);
      toast(data.type === "Evaluation" ? "Évaluation créée" : "Devoir créé");
    } catch {
      toast("Impossible de créer le devoir", "error");
    }
  }

  function openEditDevoir(devoir) {
    setEditingDevoir(devoir);
    setEditForm({
      titre: devoir.titre,
      matiere: devoir.matiere,
      description: devoir.description ?? "",
      type: devoir.type ?? "Devoir",
      optionId: devoir.optionId ?? "",
      dateLimite: versDatetimeLocal(devoir.dateLimite),
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    try {
      const { data } = await api.patch(`/devoirs/${editingDevoir.id}`, {
        ...editForm,
        optionId: editForm.optionId ? Number(editForm.optionId) : null,
        dateLimite: new Date(editForm.dateLimite).toISOString(),
      });
      setDevoirs((prev) =>
        prev
          .map((d) => (d.id === data.id ? { ...d, ...data } : d))
          .sort((a, b) => new Date(a.dateLimite) - new Date(b.dateLimite))
      );
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
      setDevoirs((prev) => prev.filter((d) => d.id !== id));
      toast("Devoir supprimé");
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
  const matieresConnues = Array.from(new Set(devoirs.map((d) => d.matiere))).sort();

  // Si la matière choisie n'existe plus dans cet onglet, on retombe sur "Toutes"
  const matiereActive = matieres.includes(filtreMatiere) ? filtreMatiere : "Toutes";
  const requete = recherche.trim().toLowerCase();

  // "Visible par" : n'apparaît que s'il y a des devoirs d'option (sinon rien à filtrer)
  const audiences = Array.from(
    new Map(devoirsDeLOnglet.filter((d) => d.option).map((d) => [d.option.id, d.option.nom]))
  ).map(([id, nom]) => ({ id, nom }));
  const audienceActive =
    filtreAudience === "tous" || filtreAudience === "groupe" || audiences.some((a) => a.id === filtreAudience)
      ? filtreAudience
      : "tous";

  const devoirsAffiches = devoirsDeLOnglet
    .filter((d) => filtreType === "Tous" || d.type === filtreType)
    .filter((d) => matiereActive === "Toutes" || d.matiere === matiereActive)
    .filter(
      (d) =>
        audienceActive === "tous" ||
        (audienceActive === "groupe" ? !d.optionId : d.optionId === audienceActive)
    )
    .filter((d) => !requete || `${d.titre} ${d.matiere}`.toLowerCase().includes(requete));

  // "À rendre" est un agenda : on regroupe par échéance (dépassée, aujourd'hui, demain...).
  // "Historique" reste une simple liste du plus récent au plus ancien.
  const sections =
    onglet === "aRendre"
      ? GROUPES.map((g) => ({
          ...g,
          items: devoirsAffiches.filter((d) => groupeEcheance(d.dateLimite, now) === g.id),
        })).filter((g) => g.items.length > 0)
      : [{ id: "historique", label: null, items: devoirsAffiches }];

  // Résumé en tête de page
  const nonRendus = devoirs.filter((d) => !d.rendu);
  const nbEvaluations = nonRendus.filter(
    (d) => d.type === "Evaluation" && new Date(d.dateLimite) >= now
  ).length;
  const nbRetard = nonRendus.filter((d) => urgenceEcheance(d.dateLimite, now) === "retard").length;

  const filtresActifs =
    filtreType !== "Tous" || matiereActive !== "Toutes" || audienceActive !== "tous" || requete !== "";

  function renderCarte(devoir) {
    const urgence = devoir.rendu ? "rendu" : urgenceEcheance(devoir.dateLimite, now);
    const { principal, secondaire } = libelleEcheance(devoir.dateLimite, now);
    const nbCommentaires = devoir._count?.commentaires || 0;

    return (
      <article
        key={devoir.id}
        className={`${styles.card} ${styles[`urgence_${urgence}`] ?? ""} ${sortants.has(`${onglet}-${devoir.id}`) ? styles.cardSortant : ""}`}
      >
        <button
          className={`${styles.check} ${devoir.rendu ? styles.checkOn : ""}`}
          onClick={() => handleToggleRendu(devoir)}
          aria-pressed={!!devoir.rendu}
          aria-label={devoir.rendu ? "Marquer comme non rendu" : "Marquer comme rendu"}
          title={devoir.rendu ? "Rendu — cliquer pour annuler" : "J'ai rendu ce devoir"}
        >
          <Check size={16} strokeWidth={2.5} />
        </button>

        <div className={styles.body}>
          <div className={styles.topline}>
            <div className={styles.badges}>
              <span className={styles.matiere}>{devoir.matiere}</span>
              {devoir.type === "Evaluation" && <span className={styles.evalBadge}>Évaluation</span>}
              {devoir.option && (
                <span
                  className={styles.optionBadge}
                  title="Visible uniquement par les membres de cette option"
                >
                  {devoir.option.nom}
                </span>
              )}
              {urgence === "retard" && <span className={styles.lateBadge}>En retard</span>}
            </div>
            <div className={styles.echeance}>
              <span className={styles.echeancePrincipal}>{principal}</span>
              <span className={styles.echeanceSecondaire}>{secondaire}</span>
            </div>
          </div>

          <h3 className={styles.titre}>{devoir.titre}</h3>
          {devoir.description && <Consignes texte={devoir.description} />}

          <div className={styles.footer}>
            <span className={styles.auteur}>Ajouté par {devoir.auteur?.nom}</span>
            <div className={styles.actions}>
              <button
                className={`${styles.commentToggle} ${nbCommentaires > 0 ? styles.commentToggleActif : ""}`}
                onClick={() => toggleComments(devoir.id)}
                title="Commentaires"
                aria-expanded={expandedId === devoir.id}
              >
                <MessageSquare size={15} strokeWidth={1.5} />
                <span>{nbCommentaires}</span>
                {expandedId === devoir.id ? (
                  <ChevronUp size={13} strokeWidth={1.5} />
                ) : (
                  <ChevronDown size={13} strokeWidth={1.5} />
                )}
              </button>
              {canCreate && (
                <button className={styles.editBtn} onClick={() => openEditDevoir(devoir)} title="Modifier">
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
              )}
              {canCreate && (
                <button className={styles.deleteBtn} onClick={() => setToDelete(devoir.id)} title="Supprimer">
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
                        <span className={styles.commentDate}>{formatDateCommentaire(c.createdAt)}</span>
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
                  onChange={(e) => setCommentInput((prev) => ({ ...prev, [devoir.id]: e.target.value }))}
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
      </article>
    );
  }

  return (
    <Layout>
      <div className={styles.page}>
        {/* Suggestions de matières déjà utilisées, sans jamais bloquer la saisie libre */}
        <datalist id="matieres-devoirs">
          {matieresConnues.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <div className={styles.header}>
          <div>
            <PageTitle>Devoirs</PageTitle>
            {!loading && !loadError && (
              <p className={styles.resume}>
                <strong>{nonRendus.length}</strong> à rendre
                {nbEvaluations > 0 && (
                  <>
                    {" · "}
                    <strong>{nbEvaluations}</strong> évaluation{nbEvaluations > 1 ? "s" : ""} à venir
                  </>
                )}
                {nbRetard > 0 && (
                  <>
                    {" · "}
                    <span className={styles.resumeRetard}>{nbRetard} en retard</span>
                  </>
                )}
              </p>
            )}
          </div>
          {canCreate && (
            <button onClick={() => setShowForm(!showForm)}>
              {showForm ? <X size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
              {showForm ? "Annuler" : "Ajouter un devoir"}
            </button>
          )}
        </div>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h2 className={styles.formTitle}>Nouveau devoir</h2>
            <div className={styles.formRow}>
              <select name="type" value={form.type} onChange={handleChange} aria-label="Type">
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                name="matiere"
                list="matieres-devoirs"
                placeholder="Matière"
                value={form.matiere}
                onChange={handleChange}
                required
              />
            </div>
            <input
              name="titre"
              placeholder="Titre"
              value={form.titre}
              onChange={handleChange}
              required
              autoFocus
            />
            <textarea
              name="description"
              placeholder="Consignes / description (optionnel)"
              rows={4}
              value={form.description}
              onChange={handleChange}
            />
            {options.length > 0 && (
              <label className={styles.dateLabel}>
                Visible par
                <select name="optionId" value={form.optionId} onChange={handleChange}>
                  <option value="">Tout le groupe</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nom} (uniquement les membres)
                    </option>
                  ))}
                </select>
              </label>
            )}
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
            <button type="submit">
              {form.type === "Evaluation" ? "Créer l'évaluation" : "Créer le devoir"}
            </button>
          </form>
        )}

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

        {/* Agenda de rendu : type, matière et recherche (issue #51) */}
        <div className={styles.toolbar}>
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
          <label className={styles.search}>
            <Search size={14} strokeWidth={1.5} />
            <input
              type="search"
              placeholder="Rechercher…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              aria-label="Rechercher un devoir"
            />
          </label>
        </div>
        {audiences.length > 0 && (
          <div className={styles.filters}>
            <span className={styles.filtreLabel}>Visible par</span>
            {[{ id: "tous", nom: "Tous" }, { id: "groupe", nom: "Mon groupe" }, ...audiences].map((a) => (
              <button
                key={a.id}
                className={`${styles.filterBtn} ${styles.filterBtnMatiere} ${audienceActive === a.id ? styles.filterActive : ""}`}
                onClick={() => setFiltreAudience(a.id)}
              >
                {a.nom}
              </button>
            ))}
          </div>
        )}
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
              <div className={styles.empty}>
                {filtresActifs && devoirsDeLOnglet.length > 0 ? (
                  <>
                    <p>Aucun résultat avec ces filtres.</p>
                    <button
                      className={styles.resetBtn}
                      onClick={() => {
                        setFiltreType("Tous");
                        setFiltreMatiere("Toutes");
                        setFiltreAudience("tous");
                        setRecherche("");
                      }}
                    >
                      Réinitialiser les filtres
                    </button>
                  </>
                ) : onglet === "aRendre" ? (
                  <>
                    <PartyPopper size={28} strokeWidth={1.5} />
                    <p>Tout est rendu, rien à faire pour l'instant.</p>
                  </>
                ) : (
                  <p>Aucun devoir dans l'historique.</p>
                )}
              </div>
            )}
            {sections.map((section) => (
              <section key={section.id} className={styles.section}>
                {section.label && (
                  <h2
                    className={`${styles.sectionTitre} ${section.id === "retard" ? styles.sectionRetard : ""}`}
                  >
                    {section.label} <span className={styles.sectionCount}>{section.items.length}</span>
                  </h2>
                )}
                {section.items.map(renderCarte)}
              </section>
            ))}
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
              list="matieres-devoirs"
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
            {options.length > 0 && (
              <label className={styles.dateLabel}>
                Visible par
                <select
                  value={editForm.optionId}
                  onChange={(e) => setEditForm({ ...editForm, optionId: e.target.value })}
                >
                  <option value="">Tout le groupe</option>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nom} (uniquement les membres)
                    </option>
                  ))}
                </select>
              </label>
            )}
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
        message="Cette action est définitive."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Layout>
  );
}
