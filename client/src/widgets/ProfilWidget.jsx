import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/index.js";
import styles from "./Widget.module.css";

export default function ProfilWidget() {
  const { user } = useAuth();
  const [form, setForm] = useState({ actuel: "", nouveau: "", confirmation: "" });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage(null);
    if (form.nouveau !== form.confirmation) return setError("Les mots de passe ne correspondent pas.");
    try {
      const { data } = await api.patch("/profil/password", { actuel: form.actuel, nouveau: form.nouveau });
      setMessage(data.message);
      setForm({ actuel: "", nouveau: "", confirmation: "" });
    } catch (err) {
      setError(err.response?.data?.error ?? "Erreur.");
    }
  }

  return (
    <div className={styles.widget}>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className={styles.header}>
        <User size={14} strokeWidth={1.5} className={styles.icon} />
        <h3>Mon profil</h3>
      </div>

      <div className={styles.profilInfo}>
        <div className={styles.profilRow}>
          <span>Nom</span>
          <strong>{user?.nom}</strong>
        </div>
        <div className={styles.profilRow}>
          <span>Groupe</span>
          <span className={styles.tag}>{user?.groupe}</span>
        </div>
        <div className={styles.profilRow}>
          <span>Rôle</span>
          <span>{user?.role}</span>
        </div>
      </div>

      <p className={styles.sectionLabel}>Changer le mot de passe</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="password"
          placeholder="Mot de passe actuel"
          value={form.actuel}
          onChange={(e) => setForm({ ...form, actuel: e.target.value })}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Nouveau mot de passe"
          value={form.nouveau}
          onChange={(e) => setForm({ ...form, nouveau: e.target.value })}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Confirmer"
          value={form.confirmation}
          onChange={(e) => setForm({ ...form, confirmation: e.target.value })}
          required
        />
        {error && <p className={styles.errorMsg}>{error}</p>}
        {message && <p className={styles.successMsg}>{message}</p>}
        <button className={styles.submitBtn} type="submit">
          Mettre à jour
        </button>
      </form>
    </div>
  );
}
