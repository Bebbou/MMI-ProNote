import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import api from "../api/index.js";
import styles from "./Admin.module.css";

export default function Admin() {
  const { user: moi } = useAuth();
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ nom: "", email: "", groupeId: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [groupes, setGroupes] = useState([]);
  const [icalDrafts, setIcalDrafts] = useState({});
  const [syncStatus, setSyncStatus] = useState({});
  const [newGroupe, setNewGroupe] = useState({ nom: "", promo: "" });
  const [newGroupeError, setNewGroupeError] = useState("");
  const [confirmDeleteGroupe, setConfirmDeleteGroupe] = useState(null);
  const [filtrePromo, setFiltrePromo] = useState("Toutes");
  const [filtreGroupeId, setFiltreGroupeId] = useState("Tous");

  useEffect(() => {
    api.get("/admin/users").then((res) => setUsers(res.data));
    api.get("/admin/groupes").then((res) => {
      setGroupes(res.data);
      setIcalDrafts(Object.fromEntries(res.data.map((g) => [g.id, g.icalUrl ?? ""])));
    });
  }, []);

  async function handleSaveIcal(id) {
    const { data } = await api.patch(`/admin/groupes/${id}`, { icalUrl: icalDrafts[id] });
    setGroupes(groupes.map((g) => (g.id === id ? data : g)));
    setSyncStatus({ ...syncStatus, [id]: "Enregistré." });
  }

  async function handleCreateGroupe(e) {
    e.preventDefault();
    setNewGroupeError("");
    try {
      const { data } = await api.post("/admin/groupes", newGroupe);
      setGroupes([...groupes, data].sort((a, b) => a.promo.localeCompare(b.promo) || a.nom.localeCompare(b.nom)));
      setIcalDrafts({ ...icalDrafts, [data.id]: "" });
      setNewGroupe({ nom: "", promo: "" });
    } catch (err) {
      setNewGroupeError(err.response?.data?.error ?? "Impossible de créer le groupe.");
    }
  }

  async function handleDeleteGroupe(id) {
    try {
      await api.delete(`/admin/groupes/${id}`);
      setGroupes(groupes.filter((g) => g.id !== id));
    } catch (err) {
      alert(err.response?.data?.error ?? "Impossible de supprimer ce groupe.");
    }
    setConfirmDeleteGroupe(null);
  }

  async function handleSyncNow(id) {
    setSyncStatus({ ...syncStatus, [id]: "Synchronisation…" });
    try {
      const { data } = await api.post(`/admin/groupes/${id}/sync-edt`);
      setSyncStatus({
        ...syncStatus,
        [id]: `${data.importes} cours importés, ${data.supprimes} retirés.`,
      });
    } catch (err) {
      setSyncStatus({ ...syncStatus, [id]: err.response?.data?.error ?? "Erreur de synchronisation." });
    }
  }

  async function handleValider(id) {
    await api.patch(`/admin/users/${id}/valider`);
    setUsers(users.map((u) => (u.id === id ? { ...u, valide: true } : u)));
  }

  async function handleRole(id, role) {
    await api.patch(`/admin/users/${id}/role`, { role });
    setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  function openEdit(u) {
    setEditUser(u);
    setEditForm({ nom: u.nom, email: u.email, groupeId: u.groupe?.id ?? "" });
  }

  async function handleEdit(e) {
    e.preventDefault();
    const { data } = await api.patch(`/admin/users/${editUser.id}`, editForm);
    setUsers(
      users.map((u) =>
        u.id === data.id ? { ...u, nom: data.nom, email: data.email, groupe: data.groupe } : u
      )
    );
    setEditUser(null);
  }

  async function handleDelete(id) {
    await api.delete(`/admin/users/${id}`);
    setUsers(users.filter((u) => u.id !== id));
    setConfirmDelete(null);
  }

  // Filtres par promo (MMI2/MMI3...) et par groupe — issue #46, utile une fois
  // plusieurs promos mélangées dans la liste des utilisateurs
  const promos = ["Toutes", ...Array.from(new Set(groupes.map((g) => g.promo)))];
  const groupesDeLaPromo = filtrePromo === "Toutes" ? groupes : groupes.filter((g) => g.promo === filtrePromo);

  function handleFiltrePromo(promo) {
    setFiltrePromo(promo);
    setFiltreGroupeId("Tous"); // le groupe sélectionné peut ne plus être dans cette promo
  }

  const usersFiltres = users.filter((u) => {
    if (filtrePromo !== "Toutes" && u.groupe?.promo !== filtrePromo) return false;
    if (filtreGroupeId !== "Tous" && u.groupe?.id !== Number(filtreGroupeId)) return false;
    return true;
  });

  const enAttente = usersFiltres.filter((u) => !u.valide);
  const valides = usersFiltres.filter((u) => u.valide);

  return (
    <Layout>
      <div className={styles.page}>
        <h1>Panel Admin</h1>

        <div className={styles.filters}>
          <label className={styles.filterLabel}>
            Promo
            <select value={filtrePromo} onChange={(e) => handleFiltrePromo(e.target.value)}>
              {promos.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className={styles.filterLabel}>
            Groupe
            <select value={filtreGroupeId} onChange={(e) => setFiltreGroupeId(e.target.value)}>
              <option value="Tous">Tous</option>
              {groupesDeLaPromo.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nom}
                </option>
              ))}
            </select>
          </label>
          {(filtrePromo !== "Toutes" || filtreGroupeId !== "Tous") && (
            <button
              type="button"
              className={styles.clearFiltersBtn}
              onClick={() => handleFiltrePromo("Toutes")}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {enAttente.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>En attente de validation ({enAttente.length})</h2>
            <div className={styles.list}>
              {enAttente.map((u) => (
                <div key={u.id} className={`${styles.card} ${styles.pending}`}>
                  <div className={styles.info}>
                    <span className={styles.nom}>{u.nom}</span>
                    <span className={styles.email}>{u.email}</span>
                    <span className={styles.groupe}>{u.groupe?.nom} · {u.groupe?.promo}</span>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.validateBtn} onClick={() => handleValider(u.id)}>
                      ✓ Valider
                    </button>
                    <button className={styles.editBtn} onClick={() => openEdit(u)}>
                      Modifier
                    </button>
                    <button className={styles.deleteBtn} onClick={() => setConfirmDelete(u)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className={styles.sectionTitle}>Groupes et flux iCal</h2>

          <form className={styles.modalForm} onSubmit={handleCreateGroupe} style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ flex: 1, minWidth: "140px" }}>
                Nom du groupe
                <input
                  placeholder="Ex: TDA1"
                  value={newGroupe.nom}
                  onChange={(e) => setNewGroupe({ ...newGroupe, nom: e.target.value })}
                  required
                />
              </label>
              <label style={{ flex: 1, minWidth: "140px" }}>
                Promo
                <input
                  placeholder="Ex: MMI3"
                  value={newGroupe.promo}
                  onChange={(e) => setNewGroupe({ ...newGroupe, promo: e.target.value })}
                  required
                />
              </label>
              <button type="submit">+ Créer le groupe</button>
            </div>
            {newGroupeError && <p className={styles.error}>{newGroupeError}</p>}
          </form>

          <div className={styles.list}>
            {groupesDeLaPromo.map((g) => (
              <div key={g.id} className={styles.card}>
                <div className={styles.info}>
                  <span className={styles.nom}>
                    {g.nom} · {g.promo}
                  </span>
                  <input
                    type="url"
                    placeholder="Lien iCal (ADE)"
                    value={icalDrafts[g.id] ?? ""}
                    onChange={(e) => setIcalDrafts({ ...icalDrafts, [g.id]: e.target.value })}
                    style={{ minWidth: "320px" }}
                  />
                  {syncStatus[g.id] && <span className={styles.email}>{syncStatus[g.id]}</span>}
                </div>
                <div className={styles.actions}>
                  <button className={styles.editBtn} onClick={() => handleSaveIcal(g.id)}>
                    Enregistrer
                  </button>
                  <button
                    className={styles.validateBtn}
                    onClick={() => handleSyncNow(g.id)}
                    disabled={!g.icalUrl}
                  >
                    Synchroniser maintenant
                  </button>
                  <button className={styles.deleteBtn} onClick={() => setConfirmDeleteGroupe(g)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>Utilisateurs actifs ({valides.length})</h2>
          <div className={styles.list}>
            {valides.map((u) => (
              <div key={u.id} className={styles.card}>
                <div className={styles.info}>
                  <span className={styles.nom}>{u.nom}</span>
                  <span className={styles.email}>{u.email}</span>
                  <span className={styles.groupe}>{u.groupe?.nom} · {u.groupe?.promo}</span>
                </div>
                <div className={styles.actions}>
                  <select
                    className={styles.roleSelect}
                    value={u.role}
                    disabled={u.id === moi?.id}
                    title={u.id === moi?.id ? "Tu ne peux pas modifier ton propre rôle" : undefined}
                    onChange={(e) => handleRole(u.id, e.target.value)}
                  >
                    <option value="etudiant">Étudiant</option>
                    <option value="delegue">Délégué</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className={styles.editBtn} onClick={() => openEdit(u)}>
                    Modifier
                  </button>
                  {u.id !== moi?.id && (
                    <button className={styles.deleteBtn} onClick={() => setConfirmDelete(u)}>
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modal édition */}
      {editUser && (
        <div className={styles.modalOverlay} onClick={() => setEditUser(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Modifier {editUser.nom}</h2>
            <form onSubmit={handleEdit} className={styles.modalForm}>
              <label>
                Nom
                <input
                  value={editForm.nom}
                  onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </label>
              <label>
                Groupe
                <select
                  value={editForm.groupeId}
                  onChange={(e) => setEditForm({ ...editForm, groupeId: Number(e.target.value) })}
                >
                  {Object.entries(
                    groupes.reduce((acc, g) => {
                      (acc[g.promo] ??= []).push(g);
                      return acc;
                    }, {})
                  ).map(([promo, gs]) => (
                    <optgroup key={promo} label={promo}>
                      {gs.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nom}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditUser(null)}>
                  Annuler
                </button>
                <button type="submit">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Supprimer {confirmDelete.nom} ?</h2>
            <p className={styles.modalWarning}>
              Cette action est irréversible. Toutes les notes de cet utilisateur seront supprimées.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button className={styles.confirmDeleteBtn} onClick={() => handleDelete(confirmDelete.id)}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression de groupe */}
      {confirmDeleteGroupe && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDeleteGroupe(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>
              Supprimer {confirmDeleteGroupe.nom} ({confirmDeleteGroupe.promo}) ?
            </h2>
            <p className={styles.modalWarning}>
              Impossible si des comptes, devoirs ou cours y sont encore rattachés.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setConfirmDeleteGroupe(null)}
              >
                Annuler
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={() => handleDeleteGroupe(confirmDeleteGroupe.id)}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
