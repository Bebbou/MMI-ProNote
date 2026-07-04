import { useState, useEffect } from "react";
import { Handle, Position } from "@xyflow/react";
import { Calendar } from "lucide-react";
import api from "../api/index.js";
import styles from "./Widget.module.css";

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function EdtWidget() {
  const [cours, setCours] = useState([]);

  useEffect(() => {
    api.get("/edt").then(res => setCours(res.data)).catch(() => {});
  }, []);

  const aujourdhui = JOURS[new Date().getDay()];
  const coursDuJour = cours
    .filter(c => c.jour === aujourdhui)
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));

  return (
    <div className={styles.widget}>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className={styles.header}>
        <Calendar size={14} strokeWidth={1.5} className={styles.icon} />
        <h3>Cours du jour</h3>
      </div>

      <div className={styles.list}>
        {coursDuJour.length === 0 && <p className={styles.empty}>Pas de cours aujourd'hui</p>}
        {coursDuJour.map(c => (
          <div key={c.id} className={styles.item}>
            <div className={styles.itemMain}>
              <span className={styles.tag}>{c.heureDebut}</span>
              <span className={styles.itemTitle}>{c.matiere}</span>
              <span className={styles.itemDate}>{c.salle || ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
