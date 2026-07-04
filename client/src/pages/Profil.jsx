import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import api from "../api/index.js";
import { usePushNotifications } from "../hooks/usePushNotifications.js";
import { useTheme, THEMES } from "../hooks/useTheme.js";
import PasswordInput from "../components/PasswordInput";
import styles from "./Profil.module.css";

export default function Profil() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState({ actuel: "", nouveau: "", confirmation: "" });
  const { isSupported, permission, subscribed, loading, enable, disable } = usePushNotifications();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage(null);

    if (form.nouveau !== form.confirmation) {
      return setError("Les nouveaux mots de passe ne correspondent pas.");
    }

    try {
      const { data } = await api.patch("/profil/password", {
        actuel: form.actuel,
        nouveau: form.nouveau,
      });
      setMessage(data.message);
      setForm({ actuel: "", nouveau: "", confirmation: "" });
    } catch (err) {
      setError(err.response?.data?.error ?? "Erreur lors de la mise à jour.");
    }
  }

  return (
    <Layout>
      <div className={styles.page}>

        {/* Header profil */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerText}>
              <div className={styles.headerName}>{user?.nom}</div>
              <div className={styles.headerMeta}>
                <span className={`${styles.headerBadge} ${styles.badgeGroupe}`}>{user?.groupe}</span>
                <span className={`${styles.headerBadge} ${styles.badgeRole}`}>{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Apparence */}
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Apparence</span>
          <div className={styles.card}>
            <div className={styles.themeGrid}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`${styles.themeOption} ${theme === t.id ? styles.themeActive : ""}`}
                  data-theme-preview={t.id}
                  onClick={() => setTheme(t.id)}
                >
                  <div className={styles.themePreview}>
                    <div className={styles.previewBar} />
                    <div className={styles.previewCard} />
                    <div className={styles.previewAccent} />
                  </div>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Notifications</span>
          <div className={styles.card}>
            {!isSupported ? (
              <p className={styles.error}>Ton navigateur ne supporte pas les notifications push.</p>
            ) : permission === "denied" ? (
              <p className={styles.error}>Notifications bloquées dans les paramètres du navigateur.</p>
            ) : (
              <button
                type="button"
                className={styles.notifBtn}
                style={{ background: subscribed ? "var(--tint-accent)" : "var(--accent)", color: subscribed ? "var(--accent)" : "#fff", border: subscribed ? "1px solid var(--accent)" : "none" }}
                onClick={subscribed ? disable : enable}
                disabled={loading}
              >
                {loading ? "..." : subscribed ? "Désactiver les notifications" : "Activer les notifications"}
              </button>
            )}
          </div>
        </div>

        {/* Mot de passe */}
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Changer le mot de passe</span>
          <div className={styles.card}>
            <form className={styles.form} onSubmit={handleSubmit}>
              <PasswordInput
                name="actuel"
                placeholder="Mot de passe actuel"
                value={form.actuel}
                onChange={handleChange}
                required
              />
              <PasswordInput
                name="nouveau"
                placeholder="Nouveau mot de passe (6 caractères min.)"
                value={form.nouveau}
                onChange={handleChange}
                required
              />
              <PasswordInput
                name="confirmation"
                placeholder="Confirmer le nouveau mot de passe"
                value={form.confirmation}
                onChange={handleChange}
                required
              />
              {error && <p className={styles.error}>{error}</p>}
              {message && <p className={styles.success}>{message}</p>}
              <button type="submit">Mettre à jour</button>
            </form>
          </div>
        </div>

      </div>
    </Layout>
  );
}
