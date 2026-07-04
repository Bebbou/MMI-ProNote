import { ReactFlow, Background, Controls, MiniMap, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, ArrowLeft, Sun, Moon } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import DevoirsWidget from "../widgets/DevoirsWidget";
import NotesWidget from "../widgets/NotesWidget";
import ProfilWidget from "../widgets/ProfilWidget";
import styles from "./Canvas.module.css";

const nodeTypes = {
  devoirs: DevoirsWidget,
  notes: NotesWidget,
  profil: ProfilWidget,
};

const initialNodes = [
  { id: "devoirs", type: "devoirs", position: { x: 50, y: 50 }, data: {} },
  { id: "notes", type: "notes", position: { x: 550, y: 50 }, data: {} },
  { id: "profil", type: "profil", position: { x: 50, y: 500 }, data: {} },
];

export default function Canvas() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.logo}>Pronote-MMI</span>
        <div className={styles.userInfo}>
          <span>{user?.nom}</span>
          <span className={styles.groupe}>{user?.groupe}</span>
        </div>
        <button className={styles.themeBtn} onClick={toggleTheme}>
          {isDark ? <Sun size={12} strokeWidth={1.5} /> : <Moon size={12} strokeWidth={1.5} />}
        </button>
        <Link to="/dashboard" className={styles.backBtn}>
          <ArrowLeft size={12} strokeWidth={1.5} />
          Vue classique
        </Link>
        <button className={styles.logout} onClick={handleLogout}>
          <LogOut size={12} strokeWidth={1.5} />
          Déconnexion
        </button>
      </div>

      <div className={styles.canvas}>
        <ReactFlow
          nodes={nodes}
          edges={[]}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color="#333333" gap={30} size={1} />
          <Controls style={{ background: "#111", border: "1px solid #333", color: "#c1b492" }} />
          <MiniMap
            nodeColor="#ff0055"
            maskColor="rgba(13, 13, 13, 0.85)"
            style={{ background: "#111111", border: "1px solid #ff0055" }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
