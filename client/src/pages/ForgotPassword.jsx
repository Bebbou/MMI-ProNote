import { useState } from "react";
import api from "../api/index.js";
import styles from "./Login.module.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Une erreur est survenue, réessaie.");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>MMIvers</h1>
        <p className={styles.subtitle}>Mot de passe oublié</p>

        {sent ? (
          <>
            <p style={{ color: "var(--text-faint)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              Si cet email est associé à un compte, tu recevras un lien de réinitialisation dans quelques instants.
            </p>
            <a href="/login">Retour à la connexion</a>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Ton adresse email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              {error && <p className={styles.error}>{error}</p>}
              <button type="submit">Envoyer le lien</button>
            </form>
            <a href="/login">Retour à la connexion</a>
          </>
        )}
      </div>
    </div>
  );
}
