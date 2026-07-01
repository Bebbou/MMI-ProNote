import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/index.js";
import PasswordInput from "../components/PasswordInput";
import styles from "./Login.module.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error ?? "Erreur de connexion.");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Pronote-MMI</h1>
        <p className={styles.subtitle}>Connexion</p>
        <form onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <PasswordInput
            name="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={handleChange}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit">Se connecter</button>
        </form>
        <a href="/forgot-password">Mot de passe oublié ?</a>
        <a href="/register">Pas encore de compte ? S'inscrire</a>
      </div>
    </div>
  );
}
