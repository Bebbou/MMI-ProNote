import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/index.js";
import PasswordInput from "../components/PasswordInput";
import styles from "./Login.module.css";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirmation: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmation) {
      return setError("Les mots de passe ne correspondent pas.");
    }
    setEnvoi(true);
    try {
      await api.post("/auth/reset-password", { token, password: form.password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.error ?? "Lien invalide ou expiré.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1>Pronote-MMI</h1>
          <p className={styles.error}>Lien invalide.</p>
          <Link to="/login">Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Pronote-MMI</h1>
        <p className={styles.subtitle}>Nouveau mot de passe</p>

        {success ? (
          <p style={{ color: "var(--text-faint)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Mot de passe mis à jour ! Tu vas être redirigé vers la connexion…
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.champ}>
              <label htmlFor="reset-password">Nouveau mot de passe</label>
              <PasswordInput
                id="reset-password"
                name="password"
                autoComplete="new-password"
                minLength={6}
                aria-describedby="reset-password-aide"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <span id="reset-password-aide" className={styles.aide}>
                6 caractères minimum
              </span>
            </div>
            <div className={styles.champ}>
              <label htmlFor="reset-confirmation">Confirmer le mot de passe</label>
              <PasswordInput
                id="reset-confirmation"
                name="confirmation"
                autoComplete="new-password"
                value={form.confirmation}
                onChange={(e) => setForm({ ...form, confirmation: e.target.value })}
                required
              />
            </div>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={envoi}>
              {envoi ? "Enregistrement…" : "Réinitialiser"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
