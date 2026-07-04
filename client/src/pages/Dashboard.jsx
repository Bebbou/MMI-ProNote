import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { BookOpen, BarChart2, Calendar, MessageSquare, FolderOpen } from "lucide-react";
import Layout from "../components/Layout";
import styles from "./Dashboard.module.css";

const cards = [
  { to: "/devoirs", label: "Devoirs à venir", icon: BookOpen },
  { to: "/notes", label: "Mes notes", icon: BarChart2 },
  { to: "/edt", label: "Emploi du temps", icon: Calendar },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/documents", label: "Cours & Ressources", icon: FolderOpen },
];

const ROLE_LABELS = { admin: "Administrateur", delegue: "Délégué", etudiant: "Étudiant" };

export default function Dashboard() {
  const { user } = useAuth();
  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role ?? "";
  const groupe = user?.groupe ?? "";

  return (
    <Layout>
      <div className={styles.page}>
        <h1>Bienvenue, {user?.nom}</h1>
        {(groupe || roleLabel) && (
          <p className={styles.subtitle}>
            {groupe && <span>Groupe {groupe}</span>}
            {groupe && roleLabel && " · "}
            {roleLabel && <span>{roleLabel}</span>}
          </p>
        )}
        <div className={styles.cards}>
          {cards.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={styles.card}>
              <span><Icon size={16} strokeWidth={1.5} /></span>
              <p>{label}</p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
