import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/index.js";
import PasswordInput from "../components/PasswordInput";
import styles from "./Login.module.css";

export default function Register() {
  const [groupes, setGroupes] = useState([]);
  const [form, setForm] = useState({ nom: "", email: "", password: "", groupeId: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [groupesErreur, setGroupesErreur] = useState(false);

  // Liste publique des groupes (id + nom + promo) : le nom seul ne suffit plus à
  // choisir un groupe depuis qu'il est réutilisé d'une promo à l'autre (MMI2, MMI3...)
  const chargerGroupes = useCallback(() => {
    setGroupesErreur(false);
    api
      .get("/auth/groupes")
      .then((res) => {
        setGroupes(res.data);
        if (res.data.length > 0) setForm((f) => ({ ...f, groupeId: res.data[0].id }));
      })
      .catch(() => setGroupesErreur(true));
  }, []);

  useEffect(() => {
    chargerGroupes();
  }, [chargerGroupes]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setEnvoi(true);
    try {
      await api.post("/auth/register", form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error ?? "Erreur lors de l'inscription.");
    } finally {
      setEnvoi(false);
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1>Pronote-MMI</h1>
          <p className={styles.subtitle}>Inscription envoyée</p>
          <p style={{ color: "var(--text-faint)", fontSize: "0.9rem" }}>
            Ton compte est en attente de validation par un administrateur. Tu recevras accès dès qu'il sera
            approuvé.
          </p>
          <Link to="/login">Retour à la connexion</Link>
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
          <div className={styles.champ}>
            <label htmlFor="register-nom">Nom complet</label>
            <input
              id="register-nom"
              name="nom"
              autoComplete="name"
              value={form.nom}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.champ}>
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.champ}>
            <label htmlFor="register-password">Mot de passe</label>
            <PasswordInput
              id="register-password"
              name="password"
              autoComplete="new-password"
              minLength={6}
              aria-describedby="register-password-aide"
              value={form.password}
              onChange={handleChange}
              required
            />
            <span id="register-password-aide" className={styles.aide}>
              6 caractères minimum
            </span>
          </div>
          <div className={styles.champ}>
            <label htmlFor="register-groupe">Groupe</label>
            {groupesErreur ? (
              <>
                <p className={styles.error} role="alert">
                  Impossible de charger les groupes.
                </p>
                <button type="button" className={styles.reessayer} onClick={chargerGroupes}>
                  Réessayer
                </button>
              </>
            ) : (
              <select
                id="register-groupe"
                name="groupeId"
                value={form.groupeId}
                onChange={handleChange}
                required
              >
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
            )}
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={envoi || groupesErreur}>
            {envoi ? "Inscription…" : "S'inscrire"}
          </button>
        </form>
        <Link to="/login">Déjà un compte ? Se connecter</Link>
      </div>
    </div>
  );
}
