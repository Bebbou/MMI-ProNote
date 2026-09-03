import { useState, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { Calendar } from "lucide-react";
import api from "../api/index.js";
import styles from "./Widget.module.css";

function formatHeure(iso) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function estAujourdhui(iso) {
  const a = new Date(iso);
  const b = new Date();
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function EdtWidget() {
  const [cours, setCours] = useState([]);

  useEffect(() => {
    api
      .get("/edt")
      .then((res) => setCours(res.data))
      .catch(() => {});
  }, []);

  const coursDuJour = cours
    .filter((c) => estAujourdhui(c.dateDebut) && !c.annule)
    .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut));

  return (
    <div className={styles.widget}>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className={styles.header}>
        <Calendar size={14} strokeWidth={1.5} className={styles.icon} />
        <h3>Cours du jour</h3>
      </div>

      <div className={styles.list}>
        {coursDuJour.length === 0 && <p className={styles.empty}>Pas de cours aujourd'hui</p>}
        {coursDuJour.map((c) => (
          <div key={c.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.tag}>{formatHeure(c.dateDebut)}</span>
              <span className={styles.itemTitle}>{c.matiere}</span>
              <span className={styles.itemDate}>{c.salle || ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
