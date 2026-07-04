import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, BookOpen, BarChart2, Calendar, User, Settings, LogOut, LayoutGrid, Sun, Menu, X, MessageSquare, FolderOpen } from "lucide-react";
import { useTheme, THEMES } from "../hooks/useTheme";
import { useState } from "react";
import ChatPanel from "./ChatPanel";
import styles from "./Layout.module.css";

const navItems = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/devoirs", label: "Devoirs", icon: BookOpen },
  { to: "/notes", label: "Notes", icon: BarChart2 },
  { to: "/edt", label: "EDT", icon: Calendar },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/documents", label: "Cours", icon: FolderOpen },
  { to: "/profil", label: "Profil", icon: User },
];

const bottomNavItems = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/devoirs", label: "Devoirs", icon: BookOpen },
  { to: "/edt", label: "EDT", icon: Calendar },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/profil", label: "Profil", icon: User },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, isDark } = useTheme();

  const THEME_DOTS = {
    mmi:      "#ff7cb7",
    dark:     "#ff7cb7",
    bleu:     "#469cd0",
    pastel:   "#e8609a",
    obsidian: "#9b7fe8",
  };
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const allNavItems = [
    ...navItems,
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: Settings }] : []),
  ];

  return (
    <div className={styles.layout}>
      {/* Sidebar desktop */}
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.accentStripe} />
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <img src="/logo-mmi.png" alt="MMI Béziers" className={styles.logoImg} />
          </div>
          <button className={styles.closeBtn} onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user?.nom}</span>
          <span className={styles.userGroupe}>{user?.groupe}</span>
        </div>
        <nav className={styles.nav}>
          {allNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ""}`
              }
            >
              <item.icon size={15} strokeWidth={1.5} />
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Theme picker */}
        <div className={styles.themePicker}>
          <button className={styles.themeBtn}>
            <Sun size={13} strokeWidth={1.5} />
            <span className={styles.navLabel}>Thème : {THEMES.find(t => t.id === theme)?.label}</span>
          </button>
          <div className={styles.themeDropdown}>
            {THEMES.map(t => (
              <button
                key={t.id}
                className={`${styles.themeItem} ${theme === t.id ? styles.themeItemActive : ""}`}
                onClick={() => setTheme(t.id)}
              >
                <span className={styles.themeDot} style={{ background: THEME_DOTS[t.id] }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <NavLink
          to="/canvas"
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `${styles.canvasBtn} ${isActive ? styles.canvasBtnActive : ""}`
          }
        >
          <LayoutGrid size={13} strokeWidth={1.5} />
          <span className={styles.navLabel}>Mode Canvas</span>
        </NavLink>
        <button className={styles.logout} onClick={handleLogout}>
          <LogOut size={13} strokeWidth={1.5} />
          <span className={styles.navLabel}>Déconnexion</span>
        </button>
      </aside>

      {/* Overlay mobile */}
      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}

      <div className={styles.content}>
        {/* Header mobile */}
        <header className={styles.mobileHeader}>
          <button className={styles.menuBtn} onClick={() => setMenuOpen(true)} aria-label="Menu">
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <span className={styles.mobileTitle}>MMIvers</span>
          <NavLink to="/profil" className={styles.themeIconBtn}>
            <User size={18} strokeWidth={1.5} />
          </NavLink>
        </header>

        <main className={styles.main}>{children}</main>
        <ChatPanel />

        {/* Bottom nav mobile */}
        <nav className={styles.bottomNav}>
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`${styles.bottomNavItem} ${isActive ? styles.bottomNavActive : ""}`}
              >
                <item.icon size={20} strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
