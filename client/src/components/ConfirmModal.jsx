import { useId } from "react";
import { useModal } from "../hooks/useModal";
import styles from "./ConfirmModal.module.css";

/*
 * Modal de confirmation themee (remplace window.confirm).
 * Rendue uniquement quand `open` est vrai.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Supprimer",
  onConfirm,
  onCancel,
}) {
  const modalRef = useModal(open, onCancel);
  const titreId = useId();

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titreId} className={styles.title}>
          {title}
        </h3>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            Annuler
          </button>
          <button className={styles.confirmBtn} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
