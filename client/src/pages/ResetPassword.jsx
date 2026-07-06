import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmation) {
      return setError("Les mots de passe ne correspondent pas.");
    }
    try {
      await api.post("/auth/reset-password", { token, password: form.password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.response?.data?.error ?? "Lien invalide ou expiré.");
    }
  }

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1>Pronote-MMI</h1>
          <p className={styles.error}>Lien invalide.</p>
          <a href="/login">Retour à la connexion</a>
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
            <PasswordInput
              name="password"
              placeholder="Nouveau mot de passe (6 caractères min.)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <PasswordInput
              name="confirmation"
              placeholder="Confirmer le mot de passe"
              value={form.confirmation}
              onChange={(e) => setForm({ ...form, confirmation: e.target.value })}
              required
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit">Réinitialiser</button>
          </form>
        )}
      </div>
    </div>
  );
}
