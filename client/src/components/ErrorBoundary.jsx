import { Component } from "react";
import styles from "./ErrorBoundary.module.css";

/*
 * Filet de sécurité : sans lui, une erreur pendant le rendu laisse une page blanche.
 * C'est une classe car React n'offre pas d'équivalent en hook pour capter ces erreurs.
 */
export default class ErrorBoundary extends Component {
  state = { erreur: false };

  static getDerivedStateFromError() {
    return { erreur: true };
  }

  componentDidCatch(error, info) {
    console.error("Erreur d'affichage :", error, info.componentStack);
  }

  render() {
    if (!this.state.erreur) return this.props.children;

    return (
      <div className={styles.page} role="alert">
        <h1>Une erreur est survenue</h1>
        <p>La page n'a pas pu s'afficher. Tes données ne sont pas perdues.</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => window.location.reload()}>
            Recharger la page
          </button>
          <a href="/dashboard">Retour à l'accueil</a>
        </div>
      </div>
    );
  }
}
