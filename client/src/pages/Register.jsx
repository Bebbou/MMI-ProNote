import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/index.js";
import PasswordInput from "../components/PasswordInput";
import styles from "./Login.module.css";

const GROUPES = ["TPA1", "TPA2", "TPB1", "TPB2"];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: "", email: "", password: "", groupeNom: "TPA1" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error ?? "Erreur lors de l'inscription.");
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1>MMIvers</h1>
          <p className={styles.subtitle}>Inscription envoyée ✅</p>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            Ton compte est en attente de validation par un administrateur.
            Tu recevras accès dès qu'il sera approuvé.
          </p>
          <a href="/login">Retour à la connexion</a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>MMIvers</h1>
        <p className={styles.subtitle}>Créer un compte</p>
        <form onSubmit={handleSubmit}>
          <input
            name="nom"
            placeholder="Nom complet"
            value={form.nom}
            onChange={handleChange}
            required
          />
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
          <select name="groupeNom" value={form.groupeNom} onChange={handleChange}>
            {GROUPES.map(g => <option key={g}>{g}</option>)}
          </select>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit">S'inscrire</button>
        </form>
        <a href="/login">Déjà un compte ? Se connecter</a>
      </div>
    </div>
  );
}
