import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/index.js";
import PasswordInput from "../components/PasswordInput";
import styles from "./Login.module.css";

export default function Login() {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [envoi, setEnvoi] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setEnvoi(true);
    try {
      const { data } = await api.post("/auth/login", form);
      // Pas de navigate ici : PublicRoute (App.jsx) redirige dès que le token existe,
      // ce qui garde un seul endroit responsable de la destination
      login(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.error ?? "Erreur de connexion.");
      setEnvoi(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Pronote-MMI</h1>
        <p className={styles.subtitle}>Connexion</p>
        {searchParams.get("expire") && <p className={styles.info}>Ta session a expiré, reconnecte-toi.</p>}
        <form onSubmit={handleSubmit}>
          <div className={styles.champ}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.champ}>
            <label htmlFor="login-password">Mot de passe</label>
            <PasswordInput
              id="login-password"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={envoi}>
            {envoi ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <Link to="/forgot-password">Mot de passe oublié ?</Link>
        <Link to="/register">Pas encore de compte ? S'inscrire</Link>
      </div>
    </div>
  );
}
