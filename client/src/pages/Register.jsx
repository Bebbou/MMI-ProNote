import { useState, useEffect } from "react";
import api from "../api/index.js";
import PasswordInput from "../components/PasswordInput";
import styles from "./Login.module.css";

export default function Register() {
  const [groupes, setGroupes] = useState([]);
  const [form, setForm] = useState({ nom: "", email: "", password: "", groupeId: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Liste publique des groupes (id + nom + promo) : le nom seul ne suffit plus à
  // choisir un groupe depuis qu'il est réutilisé d'une promo à l'autre (MMI2, MMI3...)
  useEffect(() => {
    api.get("/auth/groupes").then((res) => {
      setGroupes(res.data);
      if (res.data.length > 0) setForm((f) => ({ ...f, groupeId: res.data[0].id }));
    });
  }, []);

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
          <h1>Pronote-MMI</h1>
          <p className={styles.subtitle}>Inscription envoyée ✅</p>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            Ton compte est en attente de validation par un administrateur. Tu recevras accès dès qu'il sera
            approuvé.
          </p>
          <a href="/login">Retour à la connexion</a>
        </div>
      </div>
    );
  }

  // Regroupe les options par promo pour l'affichage (optgroup)
  const groupesParPromo = groupes.reduce((acc, g) => {
    (acc[g.promo] ??= []).push(g);
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Pronote-MMI</h1>
        <p className={styles.subtitle}>Créer un compte</p>
        <form onSubmit={handleSubmit}>
          <input name="nom" placeholder="Nom complet" value={form.nom} onChange={handleChange} required />
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
          <select name="groupeId" value={form.groupeId} onChange={handleChange}>
            {Object.entries(groupesParPromo).map(([promo, gs]) => (
              <optgroup key={promo} label={promo}>
                {gs.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nom}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit">S'inscrire</button>
        </form>
        <a href="/login">Déjà un compte ? Se connecter</a>
      </div>
    </div>
  );
}
