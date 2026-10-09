import { useState, useEffect } from "react";
import { BarChart2 } from "lucide-react";
import api from "../../api/index.js";
import WidgetCard from "./WidgetCard";

export default function NotesWidget() {
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    api
      .get("/notes")
      .then((res) => setNotes(res.data))
      .catch(() => setNotes([]));
  }, []);

  const moyenne =
    notes && notes.length > 0
      ? (
          notes.reduce((acc, n) => acc + n.valeur * n.coefficient, 0) /
          notes.reduce((acc, n) => acc + n.coefficient, 0)
        ).toFixed(2)
      : null;
  const derniereNote = notes && notes.length > 0 ? notes[0] : null;

  return (
    <WidgetCard
      to="/notes"
      label="Mes notes"
      icon={BarChart2}
      stat={notes === null ? "..." : moyenne ? `Moyenne : ${moyenne}/20` : "Aucune note"}
      detail={derniereNote ? `Dernière : ${derniereNote.matiere} — ${derniereNote.valeur}/20` : ""}
    />
  );
}
