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
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3200);
    }
    window.addEventListener("app-toast", onToast);
    return () => window.removeEventListener("app-toast", onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.stack}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${t.type === "error" ? styles.error : styles.success}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
