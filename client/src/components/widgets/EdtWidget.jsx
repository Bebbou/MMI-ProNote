import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import api from "../../api/index.js";
import WidgetCard from "./WidgetCard";

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function EdtWidget() {
  const [cours, setCours] = useState(null);

  useEffect(() => {
    api
      .get("/edt")
      .then((res) => setCours(res.data))
      .catch(() => setCours([]));
  }, []);

  const now = new Date();
  const jourActuel = JOURS[now.getDay()];
  const heureActuelle = now.toTimeString().slice(0, 5);
  const coursAujourdhui = cours?.filter((c) => c.jour === jourActuel) ?? [];
  const prochainCours =
    coursAujourdhui
      .filter((c) => c.heureDebut >= heureActuelle)
      .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))[0] ?? null;

  return (
    <WidgetCard
      to="/edt"
      label="Emploi du temps"
      icon={Calendar}
      stat={
        cours === null
          ? "..."
          : prochainCours
            ? `Prochain cours : ${prochainCours.heureDebut}`
            : "Plus de cours aujourd'hui"
      }
      detail={
        prochainCours
          ? `${prochainCours.matiere}${prochainCours.salle ? ` — ${prochainCours.salle}` : ""}`
          : ""
      }
    />
  );
}
