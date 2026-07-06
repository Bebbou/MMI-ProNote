import { useState, useEffect, useRef, useCallback } from "react";
import { ReactFlow, Background, Controls, MiniMap, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, ArrowLeft, Sun, RotateCcw } from "lucide-react";
import { useTheme, THEMES } from "../hooks/useTheme";
import DevoirsWidget from "../widgets/DevoirsWidget";
import NotesWidget from "../widgets/NotesWidget";
import ProfilWidget from "../widgets/ProfilWidget";
import EdtWidget from "../widgets/EdtWidget";
import logoMmi from "../assets/logo_mmi.jpg";
import styles from "./Canvas.module.css";

const nodeTypes = {
  devoirs: DevoirsWidget,
  notes: NotesWidget,
  profil: ProfilWidget,
  edt: EdtWidget,
};

const defaultNodes = [
  { id: "devoirs", type: "devoirs", position: { x: 50, y: 50 }, data: {} },
  { id: "notes", type: "notes", position: { x: 550, y: 50 }, data: {} },
  { id: "profil", type: "profil", position: { x: 50, y: 500 }, data: {} },
  { id: "edt", type: "edt", position: { x: 550, y: 500 }, data: {} },
];

const STORAGE_KEY = "canvas-positions";

function loadNodes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaultNodes;
    return defaultNodes.map((n) => (saved[n.id] ? { ...n, position: saved[n.id] } : n));
  } catch {
    return defaultNodes;
  }
}

/* Couleurs du fond ReactFlow adaptees a chaque theme */
const FLOW_COLORS = {
  mmi: {
    dots: "#d9d5cc",
    panel: "#FFFFFF",
    border: "#E4E2DD",
    accent: "#fe7db6",
    mask: "rgba(247,246,243,0.85)",
  },
  dark: {
    dots: "#333333",
    panel: "#111111",
    border: "#2a2a2a",
    accent: "#fe7db6",
    mask: "rgba(13,13,13,0.85)",
  },
  bleu: {
    dots: "#bdd5ee",
    panel: "#FFFFFF",
    border: "#BDD5EE",
    accent: "#469cd0",
    mask: "rgba(240,246,252,0.85)",
  },
  pastel: {
    dots: "#f2b8d4",
    panel: "#FFF8FB",
    border: "#F2B8D4",
    accent: "#e8609a",
    mask: "rgba(254,240,246,0.85)",
  },
  obsidian: {
    dots: "#2e2a40",
    panel: "#1c1928",
    border: "#2e2a40",
    accent: "#9b7fe8",
    mask: "rgba(19,17,26,0.85)",
  },
};

const THEME_DOTS = {
  mmi: "#fe7db6",
  dark: "#fe7db6",
  bleu: "#469cd0",
  pastel: "#e8609a",
  obsidian: "#9b7fe8",
};

export default function Canvas() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState(loadNodes());
  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef(null);

  const colors = FLOW_COLORS[theme] ?? FLOW_COLORS.mmi;

  useEffect(() => {
    function onClickOutside(e) {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Sauvegarde les positions a chaque deplacement
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  useEffect(() => {
    const positions = Object.fromEntries(nodes.map((n) => [n.id, n.position]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  }, [nodes]);

  function resetLayout() {
    localStorage.removeItem(STORAGE_KEY);
    setNodes(defaultNodes.map((n) => ({ ...n })));
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <img src={logoMmi} alt="MMI Béziers" className={styles.logoImg} />
        <span className={styles.logo}>Pronote-MMI</span>
        <span className={styles.canvasTag}>Canvas</span>
        <div className={styles.spacer} />
        <div className={styles.userInfo}>
          <span>{user?.nom}</span>
          <span className={styles.groupe}>{user?.groupe}</span>
        </div>

        <button className={styles.iconBtn} onClick={resetLayout} title="Réinitialiser la disposition">
          <RotateCcw size={12} strokeWidth={1.5} />
        </button>

        <div className={styles.themePicker} ref={themeRef}>
          <button className={styles.iconBtn} onClick={() => setThemeOpen((v) => !v)} title="Changer de thème">
            <Sun size={12} strokeWidth={1.5} />
          </button>
          {themeOpen && (
            <div className={styles.themeDropdown}>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.themeItem} ${theme === t.id ? styles.themeItemActive : ""}`}
                  onClick={() => {
                    setTheme(t.id);
                    setThemeOpen(false);
                  }}
                >
                  <span className={styles.themeDot} style={{ background: THEME_DOTS[t.id] }} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

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
          onNodesChange={handleNodesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color={colors.dots} gap={30} size={1.5} />
          <Controls
            style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 8 }}
          />
          <MiniMap
            nodeColor={colors.accent}
            maskColor={colors.mask}
            style={{ background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 8 }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
