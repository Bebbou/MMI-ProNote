import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
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
  const { user, token } = useAuth();
  const isAdmin = user?.role === "admin";

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtreMat, setFiltreMat] = useState("Toutes");
  const [filtreProf, setFiltreProf] = useState("Tous");
  const [filtreType, setFiltreType] = useState("Tous");
  const [expandedId, setExpandedId] = useState(null);
  const [commentaires, setCommentaires] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Form upload
  const [form, setForm] = useState({
    titre: "",
    description: "",
    matiere: "",
    prof: "",
    type: TYPES[0],
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    api.get("/documents").then((r) => {
      setDocs(r.data);
      setLoading(false);
    });
  }, []);

  const filteredDocs = docs
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
      const r = await api.get(`/documents/${docId}/commentaires`);
      setCommentaires((prev) => ({ ...prev, [docId]: r.data }));
    }
  }

  async function sendComment(docId) {
    const content = commentInput[docId]?.trim();
    if (!content) return;
    const r = await api.post(`/documents/${docId}/commentaires`, { content });
    setCommentaires((prev) => ({ ...prev, [docId]: [...(prev[docId] || []), r.data] }));
    setCommentInput((prev) => ({ ...prev, [docId]: "" }));
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, _count: { commentaires: (d._count?.commentaires || 0) + 1 } } : d
      )
    );
  }

  async function deleteComment(docId, commentId) {
    await api.delete(`/documents/commentaires/${commentId}`);
    setCommentaires((prev) => ({ ...prev, [docId]: prev[docId].filter((c) => c.id !== commentId) }));
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, _count: { commentaires: (d._count?.commentaires || 1) - 1 } } : d
      )
    );
  }

  async function deleteDoc(docId) {
    if (!confirm("Supprimer ce document ?")) return;
    await api.delete(`/documents/${docId}`);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
    if (expandedId === docId) setExpandedId(null);
  }

  function openEdit(doc) {
    setEditingDoc(doc);
    setEditForm({
      titre: doc.titre,
      description: doc.description || "",
      matiere: doc.matiere,
      prof: doc.prof || "",
      type: doc.type || "Autre",
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    const { data } = await api.patch(`/documents/${editingDoc.id}`, editForm);
    setDocs((prev) => prev.map((d) => (d.id === data.id ? data : d)));
    setEditingDoc(null);
  }

  function downloadDoc(doc) {
    const url = `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/documents/${doc.id}/download`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("Authorization", `Bearer ${token}`);
    // Use fetch to include auth header
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const burl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = burl;
        link.download = doc.fileName;
        link.click();
        URL.revokeObjectURL(burl);
      });
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
      fd.append("file", file);
      const r = await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setDocs((prev) => [r.data, ...prev]);
      setForm({ titre: "", description: "", matiere: "", prof: "", type: TYPES[0] });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setShowUpload(false);
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
            <h1 className={styles.title}>Cours & Ressources</h1>
            <p className={styles.subtitle}>
              {docs.length} document{docs.length !== 1 ? "s" : ""} disponible{docs.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isAdmin && (
            <button className={styles.uploadBtn} onClick={() => setShowUpload((v) => !v)}>
              {showUpload ? <X size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
              {showUpload ? "Annuler" : "Ajouter un cours"}
            </button>
          )}
        </div>

        {/* Formulaire upload admin */}
        {isAdmin && showUpload && (
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
                    {isAdmin && (
                      <button className={styles.editBtn} onClick={() => openEdit(doc)} title="Modifier">
                        <Pencil size={14} strokeWidth={1.5} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => deleteDoc(doc.id)}
                        title="Supprimer"
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
        <div className={styles.editOverlay} onClick={() => setEditingDoc(null)}>
          <form
            className={styles.editModal}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleEditSubmit}
          >
            <h2 className={styles.formTitle}>Modifier « {editingDoc.titre} »</h2>
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
    </Layout>
  );
}
