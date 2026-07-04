import styles from "./ConfirmModal.module.css";

/*
 * Modal de confirmation themee (remplace window.confirm).
 * Rendue uniquement quand `open` est vrai.
 */
export default function ConfirmModal({ open, title, message, confirmLabel = "Supprimer", onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>Annuler</button>
          <button className={styles.confirmBtn} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
