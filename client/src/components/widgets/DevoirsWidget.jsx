import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import api from "../../api/index.js";
import { majPastille } from "../../utils/badge";
import WidgetCard from "./WidgetCard";

export default function DevoirsWidget() {
  const [devoirs, setDevoirs] = useState(null);

  useEffect(() => {
    api
      .get("/devoirs")
      .then((res) => setDevoirs(res.data))
      .catch(() => setDevoirs([]));
  }, []);

  // Le compteur ne doit refléter que ce qu'il reste à faire : "rendu" prime sur la
  // date, sinon cocher un devoir ne fait jamais bouger le chiffre (issue #43).
  const aRendre = devoirs?.filter((d) => !d.rendu) ?? [];
  const prochainDevoir =
    aRendre.length > 0
      ? [...aRendre].sort((a, b) => new Date(a.dateLimite) - new Date(b.dateLimite))[0]
      : null;

  useEffect(() => {
    if (devoirs !== null) majPastille(aRendre.length);
  }, [devoirs, aRendre.length]);

  return (
    <WidgetCard
      to="/devoirs"
      label="Devoirs à rendre"
      icon={BookOpen}
      stat={devoirs === null ? "..." : `${aRendre.length} devoir${aRendre.length > 1 ? "s" : ""} à rendre`}
      detail={
        prochainDevoir
          ? `Prochain : ${prochainDevoir.titre} (${new Date(prochainDevoir.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })})`
          : devoirs !== null
            ? "Rien à rendre pour l'instant"
            : ""
      }
    />
  );
}
