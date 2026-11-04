import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/index.js";
import styles from "./Login.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setEnvoi(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Une erreur est survenue, réessaie.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Pronote-MMI</h1>
        <p className={styles.subtitle}>Mot de passe oublié</p>

        {sent ? (
          <>
            <p style={{ color: "var(--text-faint)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Si cet email est associé à un compte, tu recevras un lien de réinitialisation dans quelques
              instants.
            </p>
            <Link to="/login">Retour à la connexion</Link>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className={styles.champ}>
                <label htmlFor="forgot-email">Ton adresse email</label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={envoi}>
                {envoi ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
            <Link to="/login">Retour à la connexion</Link>
          </>
        )}
      </div>
    </div>
  );
}
