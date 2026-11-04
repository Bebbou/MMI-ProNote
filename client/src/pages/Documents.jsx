import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import ConfirmModal from "../components/ConfirmModal";
import { toast } from "../components/Toast";
import { useModal } from "../hooks/useModal";
import api from "../api/index.js";
import {
  FileText,
  Download,
  Trash2,
  Pencil,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from "lucide-react";
import styles from "./Documents.module.css";

const TYPES = ["CM", "TD", "TP", "Projet", "Autre"];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function Documents() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  // Issue #25 : les professeurs publient des cours, mais ne gèrent que les leurs
  const peutPublier = isAdmin || user?.role === "professeur";
  const peutGerer = (doc) => isAdmin || (peutPublier && doc.auteur.id === user?.id);

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filtreMat, setFiltreMat] = useState("Toutes");
  const [filtreProf, setFiltreProf] = useState("Tous");
  const [filtreType, setFiltreType] = useState("Tous");
  // Admin : voit toutes les promos (issue #49), filtre sur la sienne par défaut.
  // Les autres utilisateurs ne reçoivent de toute façon que les cours de leur promo.
  const [filtrePromo, setFiltrePromo] = useState(user?.promo ?? "Toutes");
  const [promos, setPromos] = useState([]);
  const [stockage, setStockage] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [commentaires, setCommentaires] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [docASupprimer, setDocASupprimer] = useState(null);
  const editModalRef = useModal(!!editingDoc, () => setEditingDoc(null));

  // Form upload
  const [form, setForm] = useState({
    titre: "",
    description: "",
    matiere: "",
    prof: "",
    type: TYPES[0],
    promo: user?.promo ?? "",
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!peutPublier) return;
    api
      .get("/documents/stockage")
      .then((r) => setStockage(r.data))
      .catch(() => {});
    api.get("/auth/groupes").then((r) => setPromos(Array.from(new Set(r.data.map((g) => g.promo))).sort()));
  }, [peutPublier]);

  const fetchDocs = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api
      .get("/documents")
      .then((r) => setDocs(r.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const filteredDocs = docs
    .filter((d) => !isAdmin || filtrePromo === "Toutes" || d.promo === filtrePromo)
    .filter((d) => filtreMat === "Toutes" || d.matiere === filtreMat)
    .filter((d) => filtreProf === "Tous" || d.prof === filtreProf)
    .filter((d) => filtreType === "Tous" || d.type === filtreType);

  async function toggleComments(docId) {
    if (expandedId === docId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(docId);
    if (!commentaires[docId]) {
      try {
        const r = await api.get(`/documents/${docId}/commentaires`);
        setCommentaires((prev) => ({ ...prev, [docId]: r.data }));
      } catch {
        setExpandedId(null);
        toast("Impossible de charger les commentaires", "error");
      }
    }
  }

  async function sendComment(docId) {
    const content = commentInput[docId]?.trim();
    if (!content) return;
    try {
      const r = await api.post(`/documents/${docId}/commentaires`, { content });
      setCommentaires((prev) => ({ ...prev, [docId]: [...(prev[docId] || []), r.data] }));
      setCommentInput((prev) => ({ ...prev, [docId]: "" }));
      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, _count: { commentaires: (d._count?.commentaires || 0) + 1 } } : d
        )
      );
    } catch (err) {
      toast(err.response?.data?.error || "Impossible d'envoyer le commentaire", "error");
    }
  }

  async function deleteComment(docId, commentId) {
    try {
      await api.delete(`/documents/commentaires/${commentId}`);
      setCommentaires((prev) => ({ ...prev, [docId]: prev[docId].filter((c) => c.id !== commentId) }));
      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, _count: { commentaires: (d._count?.commentaires || 1) - 1 } } : d
        )
      );
    } catch (err) {
      toast(err.response?.data?.error || "Impossible de supprimer le commentaire", "error");
    }
  }

  async function confirmerSuppressionDoc() {
    const { id } = docASupprimer;
    setDocASupprimer(null);
    try {
      await api.delete(`/documents/${id}`);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      if (expandedId === id) setExpandedId(null);
      toast("Document supprimé");
    } catch (err) {
      toast(err.response?.data?.error || "Impossible de supprimer le document", "error");
    }
  }

  function openEdit(doc) {
    setEditingDoc(doc);
    setEditForm({
      titre: doc.titre,
      description: doc.description || "",
      matiere: doc.matiere,
      prof: doc.prof || "",
      type: doc.type || "Autre",
      promo: doc.promo || user?.promo || "",
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    // En cas d'échec la modale reste ouverte : la saisie n'est pas perdue
    try {
      const { data } = await api.patch(`/documents/${editingDoc.id}`, editForm);
      setDocs((prev) => prev.map((d) => (d.id === data.id ? data : d)));
      setEditingDoc(null);
      toast("Document modifié");
    } catch (err) {
      toast(err.response?.data?.error || "Impossible de modifier le document", "error");
    }
  }

  // Passe par axios : le jeton est ajouté par l'intercepteur, et une réponse 403 ou 404
  // part dans le catch au lieu d'être enregistrée comme si c'était le PDF.
  async function downloadDoc(doc) {
    try {
      const { data } = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const burl = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = burl;
      link.download = doc.fileName;
      link.click();
      URL.revokeObjectURL(burl);
    } catch {
      toast("Impossible de télécharger le document", "error");
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setUploadError("Sélectionne un fichier PDF.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("titre", form.titre);
      fd.append("description", form.description);
      fd.append("matiere", form.matiere);
      fd.append("prof", form.prof);
      fd.append("type", form.type);
      fd.append("promo", form.promo);
      fd.append("file", file);
      const r = await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setDocs((prev) => [r.data, ...prev]);
      setForm({
        titre: "",
        description: "",
        matiere: "",
        prof: "",
        type: TYPES[0],
        promo: user?.promo ?? "",
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setShowUpload(false);
      toast("Document publié");
    } catch (err) {
      setUploadError(err.response?.data?.error || "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  const matieres = ["Toutes", ...Array.from(new Set(docs.map((d) => d.matiere)))];
  const profs = ["Tous", ...Array.from(new Set(docs.map((d) => d.prof).filter(Boolean)))];
  const types = ["Tous", ...Array.from(new Set(docs.map((d) => d.type).filter(Boolean)))];

  return (
    <Layout>
      <div className={styles.page}>
        {/* Suggestions de matières déjà utilisées, sans jamais bloquer la saisie libre */}
        <datalist id="matieres-existantes">
          {matieres
            .filter((m) => m !== "Toutes")
            .map((m) => (
              <option key={m} value={m} />
            ))}
        </datalist>

        <div className={styles.header}>
          <div>
            <PageTitle>Documents</PageTitle>
            <p className={styles.subtitle}>
              {loadError
                ? "Liste indisponible"
                : `${docs.length} document${docs.length !== 1 ? "s" : ""} disponible${docs.length !== 1 ? "s" : ""}`}
              {stockage && (
                <>
                  {" · "}
                  <span className={stockage.utilise > stockage.limite * 0.85 ? styles.stockageAlerte : ""}>
                    stockage {formatSize(stockage.utilise)} / {formatSize(stockage.limite)}
                  </span>
                </>
              )}
            </p>
          </div>
          {peutPublier && (
            <button className={styles.uploadBtn} onClick={() => setShowUpload((v) => !v)}>
              {showUpload ? <X size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
              {showUpload ? "Annuler" : "Ajouter un document"}
            </button>
          )}
        </div>

        {/* Formulaire de publication (admin ou professeur) */}
        {peutPublier && showUpload && (
          <form className={styles.uploadForm} onSubmit={handleUpload}>
            <h2 className={styles.formTitle}>Nouveau document</h2>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Titre *</label>
                <input
                  value={form.titre}
                  onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                  placeholder="Ex: Cours HTML/CSS — Semaine 3"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Matière *</label>
                <input
                  list="matieres-existantes"
                  value={form.matiere}
                  onChange={(e) => setForm((f) => ({ ...f, matiere: e.target.value }))}
                  placeholder="Ex: CMS avancé"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Enseignant</label>
                <input
                  value={form.prof}
                  onChange={(e) => setForm((f) => ({ ...f, prof: e.target.value }))}
                  placeholder="Ex: Talleux (optionnel)"
                />
              </div>
              <div className={styles.field}>
                <label>Type *</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Promo *</label>
                <select
                  value={form.promo}
                  onChange={(e) => setForm((f) => ({ ...f, promo: e.target.value }))}
                >
                  {promos.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label>Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brève description du contenu (optionnel)"
                />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label>Fichier PDF *</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  required
                />
              </div>
            </div>
            {uploadError && <p className={styles.error}>{uploadError}</p>}
            <button type="submit" className={styles.submitBtn} disabled={uploading}>
              {uploading ? "Upload en cours…" : "Publier le document"}
            </button>
          </form>
        )}

        {isAdmin && promos.length > 1 && (
          <div className={styles.filters}>
            {["Toutes", ...promos].map((p) => (
              <button
                key={p}
                className={`${styles.filterBtn} ${filtrePromo === p ? styles.filterActive : ""}`}
                onClick={() => setFiltrePromo(p)}
              >
                {p === "Toutes" ? "Toutes les promos" : p}
              </button>
            ))}
          </div>
        )}

        {/* Filtres : ressource, enseignant, type (issue #37) */}
        <div className={styles.filters}>
          {matieres.map((m) => (
            <button
              key={m}
              className={`${styles.filterBtn} ${filtreMat === m ? styles.filterActive : ""}`}
              onClick={() => setFiltreMat(m)}
            >
              {m}
            </button>
          ))}
        </div>
        {types.length > 1 && (
          <div className={styles.filters}>
            {types.map((t) => (
              <button
                key={t}
                className={`${styles.filterBtn} ${styles.filterBtnType} ${filtreType === t ? styles.filterActive : ""}`}
                onClick={() => setFiltreType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {profs.length > 1 && (
          <div className={styles.filters}>
            {profs.map((p) => (
              <button
                key={p}
                className={`${styles.filterBtn} ${styles.filterBtnProf} ${filtreProf === p ? styles.filterActive : ""}`}
                onClick={() => setFiltreProf(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Liste des documents */}
        {loading ? (
          <p className={styles.empty}>Chargement…</p>
        ) : loadError ? (
          <div className={styles.loadError}>
            <p>Impossible de charger les documents.</p>
            <button onClick={fetchDocs}>Réessayer</button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <p className={styles.empty}>Aucun document disponible.</p>
        ) : (
          <div className={styles.list}>
            {filteredDocs.map((doc) => (
              <div key={doc.id} className={styles.card}>
                <div className={styles.cardMain}>
                  <div className={styles.cardIcon}>
                    <FileText size={24} strokeWidth={1.5} />
                  </div>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardMeta}>
                      <span className={styles.matiereBadge}>{doc.matiere}</span>
                      <span className={styles.typeBadge}>{doc.type}</span>
                      {(isAdmin || doc.promo !== user?.promo) && (
                        <span className={styles.profBadge}>{doc.promo}</span>
                      )}
                      {doc.prof && <span className={styles.profBadge}>{doc.prof}</span>}
                      <span className={styles.cardDate}>{formatDate(doc.createdAt)}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{doc.titre}</h3>
                    {doc.description && <p className={styles.cardDesc}>{doc.description}</p>}
                    <p className={styles.cardSub}>
                      Par {doc.auteur.nom} · {formatSize(doc.fileSize)}
                    </p>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.commentToggle}
                      onClick={() => toggleComments(doc.id)}
                      title="Commentaires"
                      aria-label={`Commentaires : ${doc._count?.commentaires || 0}`}
                      aria-expanded={expandedId === doc.id}
                    >
                      <MessageSquare size={15} strokeWidth={1.5} />
                      <span>{doc._count?.commentaires || 0}</span>
                      {expandedId === doc.id ? (
                        <ChevronUp size={13} strokeWidth={1.5} />
                      ) : (
                        <ChevronDown size={13} strokeWidth={1.5} />
                      )}
                    </button>
                    <button
                      className={styles.downloadBtn}
                      onClick={() => downloadDoc(doc)}
                      title="Télécharger"
                    >
                      <Download size={15} strokeWidth={1.5} />
                      Télécharger
                    </button>
                    {peutGerer(doc) && (
                      <button
                        className={styles.editBtn}
                        onClick={() => openEdit(doc)}
                        title="Modifier"
                        aria-label={`Modifier ${doc.titre}`}
                      >
                        <Pencil size={14} strokeWidth={1.5} />
                      </button>
                    )}
                    {peutGerer(doc) && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setDocASupprimer(doc)}
                        title="Supprimer"
                        aria-label={`Supprimer ${doc.titre}`}
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Section commentaires */}
                {expandedId === doc.id && (
                  <div className={styles.comments}>
                    <div className={styles.commentsList}>
                      {!commentaires[doc.id] ? (
                        <p className={styles.commentsEmpty}>Chargement…</p>
                      ) : commentaires[doc.id].length === 0 ? (
                        <p className={styles.commentsEmpty}>Aucun commentaire. Sois le premier !</p>
                      ) : (
                        commentaires[doc.id].map((c) => (
                          <div key={c.id} className={styles.comment}>
                            <div className={styles.commentHeader}>
                              <span className={styles.commentAuteur}>{c.auteur.nom}</span>
                              <span className={styles.commentDate}>{formatDate(c.createdAt)}</span>
                              {(isAdmin || c.auteur.id == user?.id) && (
                                <button
                                  className={styles.commentDelete}
                                  onClick={() => deleteComment(doc.id, c.id)}
                                  aria-label="Supprimer le commentaire"
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
                        sendComment(doc.id);
                      }}
                    >
                      <input
                        className={styles.commentInput}
                        placeholder="Ajouter un commentaire…"
                        value={commentInput[doc.id] || ""}
                        onChange={(e) => setCommentInput((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                      />
                      <button
                        type="submit"
                        className={styles.commentSend}
                        disabled={!commentInput[doc.id]?.trim()}
                      >
                        <Send size={14} strokeWidth={1.5} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale d'édition des tags (ressource/enseignant/type) — issue #37 */}
      {editingDoc && (
        <div className={styles.editOverlay}>
          <form
            ref={editModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-edition-document"
            className={styles.editModal}
            onSubmit={handleEditSubmit}
          >
            <h2 id="titre-edition-document" className={styles.formTitle}>
              Modifier « {editingDoc.titre} »
            </h2>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label>Titre *</label>
                <input
                  value={editForm.titre}
                  onChange={(e) => setEditForm((f) => ({ ...f, titre: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Matière *</label>
                <input
                  list="matieres-existantes"
                  value={editForm.matiere}
                  onChange={(e) => setEditForm((f) => ({ ...f, matiere: e.target.value }))}
                  placeholder="Ex: CMS avancé"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Enseignant</label>
                <input
                  value={editForm.prof}
                  onChange={(e) => setEditForm((f) => ({ ...f, prof: e.target.value }))}
                  placeholder="Ex: Talleux (optionnel)"
                />
              </div>
              <div className={styles.field}>
                <label>Type *</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Promo *</label>
                <select
                  value={editForm.promo}
                  onChange={(e) => setEditForm((f) => ({ ...f, promo: e.target.value }))}
                >
                  {promos.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label>Description</label>
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brève description du contenu (optionnel)"
                />
              </div>
            </div>
            <div className={styles.editActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setEditingDoc(null)}>
                Annuler
              </button>
              <button type="submit" className={styles.submitBtn}>
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={docASupprimer !== null}
        title="Supprimer ce document ?"
        message={docASupprimer && `« ${docASupprimer.titre} » et ses commentaires seront supprimés.`}
        onConfirm={confirmerSuppressionDoc}
        onCancel={() => setDocASupprimer(null)}
      />
    </Layout>
  );
}
