import { useState } from "react";
import { CheckCircle2, XCircle, BarChart2 } from "lucide-react";
import api from "../api/index.js";
import styles from "./SondageCard.module.css";

export default function SondageCard({ sondage, currentUserId, isPrivileged, onUpdate, onDelete }) {
  const [voting, setVoting] = useState(false);

  const totalVotes = sondage.options.reduce((acc, o) => acc + o.votes.length, 0);
  const myVote = sondage.options.find((o) => o.votes.some((v) => v.userId === currentUserId));

  async function vote(optionId) {
    if (sondage.clos || voting) return;
    setVoting(true);
    try {
      const { data } = await api.post(`/sondages/${sondage.id}/vote`, { optionId });
      onUpdate?.(data);
    } finally {
      setVoting(false);
    }
  }

  async function clore() {
    const { data } = await api.patch(`/sondages/${sondage.id}/clore`);
    onUpdate?.(data);
  }

  async function supprimer() {
    await api.delete(`/sondages/${sondage.id}`);
    onDelete?.(sondage.id);
  }

  return (
    <div className={`${styles.card} ${sondage.clos ? styles.clos : ""}`}>
      <div className={styles.header}>
        <BarChart2 size={13} strokeWidth={1.5} />
        <span className={styles.auteur}>{sondage.auteur.nom}</span>
        {sondage.clos && <span className={styles.closBadge}>Clos</span>}
        {isPrivileged && (
          <div className={styles.actions}>
            {!sondage.clos && (
              <button className={styles.actionBtn} onClick={clore}>
                Clore
              </button>
            )}
            <button className={styles.actionBtn} onClick={supprimer}>
              <XCircle size={12} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      <p className={styles.question}>{sondage.question}</p>

      <div className={styles.options}>
        {sondage.options.map((option) => {
          const count = option.votes.length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVote?.id === option.id;

          return (
            <button
              key={option.id}
              className={`${styles.option} ${isMyVote ? styles.voted : ""} ${sondage.clos ? styles.optionClos : ""}`}
              onClick={() => vote(option.id)}
              disabled={sondage.clos || voting}
            >
              <div
                className={styles.optionBar}
                style={{ width: myVote || sondage.clos ? `${pct}%` : "0%" }}
              />
              <span className={styles.optionTexte}>{option.texte}</span>
              {(myVote || sondage.clos) && (
                <span className={styles.optionPct}>
                  {pct}% <span className={styles.optionCount}>({count})</span>
                </span>
              )}
              {isMyVote && <CheckCircle2 size={12} strokeWidth={1.5} className={styles.checkIcon} />}
            </button>
          );
        })}
      </div>

      <span className={styles.total}>
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
