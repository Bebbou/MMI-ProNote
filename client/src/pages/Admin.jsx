import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../api/index.js";
import styles from "./Admin.module.css";

const GROUPES = ["TPA1", "TPA2", "TPB1", "TPB2"];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ nom: "", email: "", groupeNom: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    api.get("/admin/users").then(res => setUsers(res.data));
  }, []);

  async function handleValider(id) {
    await api.patch(`/admin/users/${id}/valider`);
    setUsers(users.map(u => u.id === id ? { ...u, valide: true } : u));
  }

  async function handleRole(id, role) {
    await api.patch(`/admin/users/${id}/role`, { role });
    setUsers(users.map(u => u.id === id ? { ...u, role } : u));
  }

  function openEdit(u) {
    setEditUser(u);
    setEditForm({ nom: u.nom, email: u.email, groupeNom: u.groupe?.nom ?? "" });
  }

  async function handleEdit(e) {
    e.preventDefault();
    const { data } = await api.patch(`/admin/users/${editUser.id}`, editForm);
    setUsers(users.map(u => u.id === data.id ? { ...u, nom: data.nom, email: data.email, groupe: data.groupe } : u));
    setEditUser(null);
  }

  async function handleDelete(id) {
    await api.delete(`/admin/users/${id}`);
    setUsers(users.filter(u => u.id !== id));
    setConfirmDelete(null);
  }

  const enAttente = users.filter(u => !u.valide);
  const valides = users.filter(u => u.valide);

  return (
    <Layout>
      <div className={styles.page}>
        <h1>Panel Admin</h1>

        {enAttente.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>En attente de validation ({enAttente.length})</h2>
            <div className={styles.list}>
              {enAttente.map(u => (
                <div key={u.id} className={`${styles.card} ${styles.pending}`}>
                  <div className={styles.info}>
                    <span className={styles.nom}>{u.nom}</span>
                    <span className={styles.email}>{u.email}</span>
                    <span className={styles.groupe}>{u.groupe?.nom}</span>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.validateBtn} onClick={() => handleValider(u.id)}>✓ Valider</button>
                    <button className={styles.editBtn} onClick={() => openEdit(u)}>Modifier</button>
                    <button className={styles.deleteBtn} onClick={() => setConfirmDelete(u)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className={styles.sectionTitle}>Utilisateurs actifs ({valides.length})</h2>
          <div className={styles.list}>
            {valides.map(u => (
              <div key={u.id} className={styles.card}>
                <div className={styles.info}>
                  <span className={styles.nom}>{u.nom}</span>
                  <span className={styles.email}>{u.email}</span>
                  <span className={styles.groupe}>{u.groupe?.nom}</span>
                </div>
                <div className={styles.actions}>
                  <select
                    className={styles.roleSelect}
                    value={u.role}
                    onChange={e => handleRole(u.id, e.target.value)}
                  >
                    <option value="etudiant">Étudiant</option>
                    <option value="delegue">Délégué</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className={styles.editBtn} onClick={() => openEdit(u)}>Modifier</button>
                  <button className={styles.deleteBtn} onClick={() => setConfirmDelete(u)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modal édition */}
      {editUser && (
        <div className={styles.modalOverlay} onClick={() => setEditUser(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Modifier {editUser.nom}</h2>
            <form onSubmit={handleEdit} className={styles.modalForm}>
              <label>
                Nom
                <input value={editForm.nom} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} required />
              </label>
              <label>
                Email
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </label>
              <label>
                Groupe
                <select value={editForm.groupeNom} onChange={e => setEditForm({ ...editForm, groupeNom: e.target.value })}>
                  {GROUPES.map(g => <option key={g}>{g}</option>)}
                </select>
              </label>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditUser(null)}>Annuler</button>
                <button type="submit">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Supprimer {confirmDelete.nom} ?</h2>
            <p className={styles.modalWarning}>Cette action est irréversible. Toutes les notes de cet utilisateur seront supprimées.</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className={styles.confirmDeleteBtn} onClick={() => handleDelete(confirmDelete.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
