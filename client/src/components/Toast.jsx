import { useState, useEffect } from "react";
import styles from "./Toast.module.css";

/*
 * Systeme de toasts leger, sans dependance.
 * Usage : toast("Devoir cree") ou toast("Erreur...", "error")
 * <Toaster /> est monte une seule fois dans Layout.
 */

let idCounter = 0;

export function toast(message, type = "success") {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { id: ++idCounter, message, type } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const t = e.detail;
      setToasts((prev) => [...prev, t]);
      // Une erreur se lit et se comprend : elle reste plus longtemps qu'un succès
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, t.type === "error" ? 6500 : 3200);
    }
    window.addEventListener("app-toast", onToast);
    return () => window.removeEventListener("app-toast", onToast);
  }, []);

  // Le conteneur reste monté même vide : un lecteur d'écran n'annonce que les
  // changements dans une zone aria-live qui existait déjà
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.type === "error" ? "alert" : undefined}
          className={`${styles.toast} ${t.type === "error" ? styles.error : styles.success}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
