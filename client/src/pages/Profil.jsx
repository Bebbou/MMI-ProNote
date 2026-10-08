import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import api from "../api/index.js";
import { usePushNotifications } from "../hooks/usePushNotifications.js";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";
import { estInstalle } from "../utils/pwa.js";
import { toast } from "../components/Toast";
import { useTheme, THEMES } from "../hooks/useTheme.js";
import PasswordInput from "../components/PasswordInput";
import PageTitle from "../components/PageTitle";
import AppFooter from "../components/AppFooter";
import MesOptions from "../components/MesOptions";
import PreferencesNotifications from "../components/PreferencesNotifications";
import styles from "./Profil.module.css";

const THEME_DOTS = {
  mmi: "#fe7db6",
  dark: "#fe7db6",
  bleu: "#469cd0",
  pastel: "#e8609a",
  obsidian: "#9b7fe8",
};

export default function Profil() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState({ actuel: "", nouveau: "", confirmation: "" });
  const {
    isSupported,
    needsInstall,
    permission,
    subscribed,
    loading,
    error: notifError,
    enable,
    disable,
    sendTest,
  } = usePushNotifications();
  const { installable, installer } = useInstallPrompt();
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  async function tester() {
    if (await sendTest()) toast("Notification envoyée : regarde ton appareil");
  }

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
      setError(err.response?.data?.error ?? "Erreur lors de la mise a jour.");
    }
  }

  return (
    <Layout>
      <div className={styles.page}>
        <PageTitle>Mon profil</PageTitle>

        <div className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Nom</span>
            <span>{user?.nom}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Groupe</span>
            <span className={styles.groupe}>{user?.groupe}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Role</span>
            <span className={styles.role}>{user?.role}</span>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Mes options</h2>
          <MesOptions />
        </div>

        <div className={styles.section}>
          <h2>Apparence</h2>
          <div className={styles.themeGrid}>
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`${styles.themeOption} ${theme === t.id ? styles.themeActive : ""}`}
                data-theme-preview={t.id}
                onClick={() => setTheme(t.id)}
              >
                <div className={styles.themePreview}>
                  <div className={styles.previewSidebar} />
                  <div className={styles.previewCard} />
                  <div className={styles.previewAccent} />
                </div>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h2>Notifications</h2>
          <div className={styles.notifCard}>
            {needsInstall ? (
              <p className={styles.notifInfo}>
                Sur iPhone, les notifications ne marchent que si l'application est installée : appuie sur{" "}
                <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>, et rouvre
                l'application depuis son icône.
              </p>
            ) : !isSupported ? (
              <p className={styles.error}>Ton navigateur ne supporte pas les notifications push.</p>
            ) : permission === "denied" ? (
              <p className={styles.error}>
                Les notifications sont bloquées. Pour les réactiver, clique sur le cadenas à gauche de
                l'adresse, ouvre « Notifications » et choisis « Autoriser » (sur mobile : réglages du
                navigateur ou de l'application).
              </p>
            ) : (
              <>
                <p className={styles.notifInfo}>
                  Sur cet appareil : <strong>{subscribed ? "activées" : "désactivées"}</strong>
                </p>
                <ul className={styles.notifListe}>
                  <li>Nouveaux devoirs et évaluations</li>
                  <li>Rappel la veille d'une échéance, si tu n'as pas rendu</li>
                  <li>Nouveaux cours et annonces</li>
                </ul>
                <div className={styles.notifActions}>
                  <button
                    type="button"
                    className={`${styles.notifBtn} ${subscribed ? styles.notifBtnOn : ""}`}
                    onClick={subscribed ? disable : enable}
                    disabled={loading}
                  >
                    {loading
                      ? "…"
                      : subscribed
                        ? "Désactiver les notifications"
                        : "Activer les notifications"}
                  </button>
                  {subscribed && (
                    <button type="button" className={styles.notifTest} onClick={tester}>
                      Envoyer une notification test
                    </button>
                  )}
                </div>
                {notifError && <p className={styles.error}>{notifError}</p>}
              </>
            )}
            {installable && !estInstalle() && (
              <button type="button" className={styles.notifTest} onClick={installer}>
                Installer l'application
              </button>
            )}
          </div>
          <PreferencesNotifications />
        </div>

        <div className={styles.section}>
          <h2>Changer le mot de passe</h2>
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
              placeholder="Nouveau mot de passe (6 caracteres min.)"
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
            <button type="submit">Mettre a jour</button>
          </form>
        </div>

        <AppFooter />
      </div>
    </Layout>
  );
}
