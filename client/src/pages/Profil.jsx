import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import MmiDecor from "../components/MmiDecor";
import api from "../api/index.js";
import { usePushNotifications } from "../hooks/usePushNotifications.js";
import { useTheme, THEMES } from "../hooks/useTheme.js";
import { Bell, User, Users, Shield } from "lucide-react";
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
    if (form.nouveau !== form.confirmation) return setError("Les nouveaux mots de passe ne correspondent pas.");
    try {
      const { data } = await api.patch("/profil/password", { actuel: form.actuel, nouveau: form.nouveau });
      setMessage(data.message);
      setForm({ actuel: "", nouveau: "", confirmation: "" });
    } catch (err) {
      setError(err.response?.data?.error ?? "Erreur lors de la mise à jour.");
    }
  }

  const THEME_COLORS = {
    mmi: "#ff7cb7", dark: "#ff7cb7", bleu: "#469cd0", pastel: "#e8609a", obsidian: "#9b7fe8",
  };

  return (
    <Layout>
      <div className={styles.page}>
        <MmiDecor />

        <div className={styles.content}>
          <h1 className={styles.title}>Mon profil</h1>

          {/* Cartes info */}
          <div className={styles.infoCards}>
            <div className={styles.infoCard} style={{ "--card-color": "#ff7cb7" }}>
              <div className={styles.cardIcon}><User size={18} strokeWidth={1.5} /></div>
              <div>
                <span className={styles.cardLabel}>Nom</span>
                <span className={styles.cardValue}>{user?.nom}</span>
              </div>
            </div>
            <div className={styles.infoCard} style={{ "--card-color": "#469cd0" }}>
              <div className={styles.cardIcon}><Users size={18} strokeWidth={1.5} /></div>
              <div>
                <span className={styles.cardLabel}>Groupe</span>
                <span className={styles.cardValue}>{user?.groupe}</span>
              </div>
            </div>
            <div className={styles.infoCard} style={{ "--card-color": "#ff8d1a" }}>
              <div className={styles.cardIcon}><Shield size={18} strokeWidth={1.5} /></div>
              <div>
                <span className={styles.cardLabel}>Rôle</span>
                <span className={styles.cardValue} style={{ textTransform: "capitalize" }}>{user?.role}</span>
              </div>
            </div>
          </div>

          <div className={styles.columns}>
            {/* Colonne gauche */}
            <div className={styles.leftCol}>
              {/* Notifications */}
              <div className={styles.notifCard}>
                <div className={styles.notifHeader}>
                  <Bell size={16} strokeWidth={1.5} />
                  <span>Notifications</span>
                </div>
                <p className={styles.notifDesc}>Restez informé de l'actualité de votre formation.</p>
                {!isSupported ? (
                  <p className={styles.errorText}>Navigateur non compatible.</p>
                ) : permission === "denied" ? (
                  <p className={styles.errorText}>Notifications bloquées dans le navigateur.</p>
                ) : (
                  <button
                    className={`${styles.notifBtn} ${subscribed ? styles.notifBtnActive : ""}`}
                    onClick={subscribed ? disable : enable}
                    disabled={loading}
                  >
                    <Bell size={14} strokeWidth={1.5} />
                    {loading ? "..." : subscribed ? "Désactiver" : "Activer les notifications"}
                  </button>
                )}
              </div>

              {/* Thème */}
              <div className={styles.section}>
                <h2>Apparence</h2>
                <div className={styles.themeGrid}>
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      className={`${styles.themeOption} ${theme === t.id ? styles.themeActive : ""}`}
                      data-theme-preview={t.id}
                      onClick={() => setTheme(t.id)}
                      style={{ "--dot": THEME_COLORS[t.id] }}
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

            {/* Colonne droite — mot de passe */}
            <div className={styles.rightCol}>
              <div className={styles.section}>
                <h2>Changer le mot de passe</h2>
                <form className={styles.form} onSubmit={handleSubmit}>
                  <PasswordInput name="actuel" placeholder="Mot de passe actuel" value={form.actuel} onChange={handleChange} required />
                  <PasswordInput name="nouveau" placeholder="Nouveau mot de passe (6 caractères min.)" value={form.nouveau} onChange={handleChange} required />
                  <PasswordInput name="confirmation" placeholder="Confirmer le nouveau mot de passe" value={form.confirmation} onChange={handleChange} required />
                  {error && <p className={styles.errorText}>{error}</p>}
                  {message && <p className={styles.successText}>{message}</p>}
                  <button type="submit" className={styles.submitBtn}>Mettre à jour</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
