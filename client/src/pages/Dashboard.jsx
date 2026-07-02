import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className={styles.page}>
        <h1>Bienvenue, {user?.nom}</h1>
        <p className={styles.subtitle}>GROUPE_{user?.groupe} / {user?.role.toUpperCase()}</p>
        <div className={styles.cards}>
          {cards.map(({ to, label, icon: Icon }) => (
            <div key={to} className={styles.card} onClick={() => navigate(to)}>
              <span><Icon size={16} strokeWidth={1.5} /></span>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
