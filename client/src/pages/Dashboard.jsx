import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { BookOpen, BarChart2, Calendar, MessageSquare, FolderOpen } from "lucide-react";
import Layout from "../components/Layout";
import PageTitle from "../components/PageTitle";
import api from "../api/index.js";
import styles from "./Dashboard.module.css";

const ROLE_LABELS = { admin: "Administrateur", delegue: "Délégué", etudiant: "Étudiant" };
const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function Dashboard() {
  const { user } = useAuth();
  const [devoirs, setDevoirs] = useState(null);
  const [notes, setNotes] = useState(null);
  const [cours, setCours] = useState(null);

  useEffect(() => {
    api.get("/devoirs").then(res => setDevoirs(res.data)).catch(() => setDevoirs([]));
    api.get("/notes").then(res => setNotes(res.data)).catch(() => setNotes([]));
    api.get("/edt").then(res => setCours(res.data)).catch(() => setCours([]));
  }, []);

  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role ?? "";
  const groupe = user?.groupe ?? "";

  // ── Devoirs : combien a venir, prochain ──
  const now = new Date();
  const aVenir = devoirs?.filter(d => new Date(d.dateLimite) >= now) ?? [];
  const prochainDevoir = aVenir.length > 0
    ? [...aVenir].sort((a, b) => new Date(a.dateLimite) - new Date(b.dateLimite))[0]
    : null;

  // ── Notes : moyenne + derniere ──
  const moyenne = notes && notes.length > 0
    ? (notes.reduce((acc, n) => acc + n.valeur * n.coefficient, 0) /
       notes.reduce((acc, n) => acc + n.coefficient, 0)).toFixed(2)
    : null;
  const derniereNote = notes && notes.length > 0 ? notes[0] : null;

  // ── EDT : prochain cours aujourd'hui ──
  const jourActuel = JOURS[now.getDay()];
  const heureActuelle = now.toTimeString().slice(0, 5);
  const coursAujourdhui = cours?.filter(c => c.jour === jourActuel) ?? [];
  const prochainCours = coursAujourdhui
    .filter(c => c.heureDebut >= heureActuelle)
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))[0] ?? null;

  const cards = [
    {
      to: "/devoirs",
      label: "Devoirs à venir",
      icon: BookOpen,
      stat: devoirs === null ? "..." : `${aVenir.length} devoir${aVenir.length > 1 ? "s" : ""} à rendre`,
      detail: prochainDevoir
        ? `Prochain : ${prochainDevoir.titre} (${new Date(prochainDevoir.dateLimite).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })})`
        : devoirs !== null ? "Rien à rendre pour l'instant" : "",
    },
    {
      to: "/notes",
      label: "Mes notes",
      icon: BarChart2,
      stat: notes === null ? "..." : moyenne ? `Moyenne : ${moyenne}/20` : "Aucune note",
      detail: derniereNote ? `Dernière : ${derniereNote.matiere} — ${derniereNote.valeur}/20` : "",
    },
    {
      to: "/edt",
      label: "Emploi du temps",
      icon: Calendar,
      stat: cours === null ? "..." : prochainCours
        ? `Prochain cours : ${prochainCours.heureDebut}`
        : "Plus de cours aujourd'hui",
      detail: prochainCours
        ? `${prochainCours.matiere}${prochainCours.salle ? ` — ${prochainCours.salle}` : ""}`
        : "",
    },
    { to: "/chat", label: "Chat", icon: MessageSquare, stat: "Discuter avec le groupe", detail: "" },
    { to: "/documents", label: "Cours & Ressources", icon: FolderOpen, stat: "Fichiers partagés", detail: "" },
  ];

  return (
    <Layout>
      <div className={styles.page}>
        <PageTitle>Bienvenue, {user?.nom}</PageTitle>
        {(groupe || roleLabel) && (
          <p className={styles.subtitle}>
            {groupe && <span>Groupe {groupe}</span>}
            {groupe && roleLabel && " · "}
            {roleLabel && <span>{roleLabel}</span>}
          </p>
        )}
        <div className={styles.cards}>
          {cards.map(({ to, label, icon: Icon, stat, detail }) => (
            <Link key={to} to={to} className={styles.card}>
              <span className={styles.cardIcon}><Icon size={16} strokeWidth={1.5} /></span>
              <p className={styles.cardLabel}>{label}</p>
              <p className={styles.cardStat}>{stat}</p>
              {detail && <p className={styles.cardDetail}>{detail}</p>}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
