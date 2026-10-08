import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOptions } from "../hooks/useOptions";
import ConfirmModal from "./ConfirmModal";
import { toast } from "./Toast";
import api from "../api/index.js";
import styles from "./MesOptions.module.css";

// Choix des options (anglais renforcé...) : décide quels devoirs d'option l'élève voit.
// Les admins peuvent en plus créer et supprimer les options de la promo.
export default function MesOptions() {
  const { user } = useAuth();
  const { options, setOptions, loading } = useOptions();
  const [nouveauNom, setNouveauNom] = useState("");
  const [aSupprimer, setASupprimer] = useState(null);
  const isAdmin = user?.role === "admin";

  async function basculer(option) {
    const rejoint = !option.membre;
    // Optimiste : on bascule tout de suite, on annule si le serveur refuse
    const maj = (membre) =>
      setOptions((prev) =>
        prev.map((o) =>
          o.id === option.id ? { ...o, membre, nbMembres: o.nbMembres + (membre ? 1 : -1) } : o
        )
      );
    maj(rejoint);
    try {
      if (rejoint) await api.put(`/options/${option.id}/adhesion`);
      else await api.delete(`/options/${option.id}/adhesion`);
    } catch {
      maj(!rejoint);
      toast("Impossible de mettre à jour l'option", "error");
    }
  }

  async function creer(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/options", { nom: nouveauNom });
      setOptions((prev) => [...prev, data].sort((a, b) => a.nom.localeCompare(b.nom)));
      setNouveauNom("");
      toast("Option créée");
    } catch (err) {
      toast(err.response?.data?.error ?? "Impossible de créer l'option", "error");
    }
  }

  async function supprimer() {
    const option = aSupprimer;
    setASupprimer(null);
    try {
      await api.delete(`/options/${option.id}`);
      setOptions((prev) => prev.filter((o) => o.id !== option.id));
      toast("Option supprimée");
    } catch {
      toast("Impossible de supprimer l'option", "error");
    }
  }

  if (loading) return <p className={styles.vide}>Chargement…</p>;

  return (
    <div className={styles.wrap}>
      {options.length === 0 ? (
        <p className={styles.vide}>
          {isAdmin
            ? "Aucune option pour l'instant. Crée-en une ci-dessous."
            : "Aucune option n'est configurée pour ta promo."}
        </p>
      ) : (
        <>
          <p className={styles.aide}>
            Coche tes options : tu verras les devoirs qui leur sont réservés (anglais renforcé...).
          </p>
          <div className={styles.liste}>
            {options.map((o) => (
              <div key={o.id} className={styles.ligne}>
                <button
                  className={`${styles.option} ${o.membre ? styles.optionActive : ""}`}
                  onClick={() => basculer(o)}
                  aria-pressed={o.membre}
                >
                  <span className={styles.coche}>{o.membre && <Check size={12} strokeWidth={3} />}</span>
                  <span className={styles.nom}>{o.nom}</span>
                  <span className={styles.nb}>
                    {o.nbMembres} élève{o.nbMembres > 1 ? "s" : ""}
                  </span>
                </button>
                {isAdmin && (
                  <button
                    className={styles.suppr}
                    onClick={() => setASupprimer(o)}
                    title="Supprimer l'option"
                    aria-label={`Supprimer l'option ${o.nom}`}
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {isAdmin && (
        <form className={styles.ajout} onSubmit={creer}>
          <input
            placeholder="Nouvelle option (ex. Anglais renforcé)"
            value={nouveauNom}
            maxLength={60}
            onChange={(e) => setNouveauNom(e.target.value)}
            required
          />
          <button type="submit">
            <Plus size={14} strokeWidth={1.5} />
            Ajouter
          </button>
        </form>
      )}

      <ConfirmModal
        open={aSupprimer !== null}
        title={`Supprimer « ${aSupprimer?.nom} » ?`}
        message="Les devoirs rattachés à cette option seront aussi supprimés."
        onConfirm={supprimer}
        onCancel={() => setASupprimer(null)}
      />
    </div>
  );
}
