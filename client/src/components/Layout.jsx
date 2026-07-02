import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, BookOpen, BarChart2, Calendar, User, Settings, LogOut, LayoutGrid, Sun, Moon, Menu, X, MessageSquare } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useState } from "react";
import ChatPanel from "./ChatPanel";
import styles from "./Layout.module.css";

const navItems = [
  { to: "/dashboard", label: "Accueil", icon: Home },
  { to: "/devoirs", label: "Devoirs", icon: BookOpen },
  { to: "/notes", label: "Notes", icon: BarChart2 },
  { to: "/edt", label: "EDT", icon: Calendar },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/profil", label: "Profil", icon: User },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
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
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            {/* Mini logo MMI circulaire */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 3 A13 13 0 0 1 29 16" stroke="#ff7cb7" strokeWidth="5" strokeLinecap="round" fill="none"/>
              <path d="M29 16 A13 13 0 0 1 16 29" stroke="#ff8d1a" strokeWidth="5" strokeLinecap="round" fill="none"/>
              <path d="M16 29 A13 13 0 0 1 3 16" stroke="#469cd0" strokeWidth="5" strokeLinecap="round" fill="none" strokeDasharray="3 3"/>
            </svg>
            <div className={styles.logoText}>
              <span className={styles.logoMain}>Pronote</span>
              <span className={styles.logoSub}>MMI Béziers</span>
            </div>
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
        <button className={styles.themeBtn} onClick={toggleTheme} title={theme === "light" ? "Mode sombre" : "Mode clair"}>
          {theme === "light" ? <Moon size={13} strokeWidth={1.5} /> : <Sun size={13} strokeWidth={1.5} />}
          <span className={styles.navLabel}>{theme === "light" ? "Mode sombre" : "Mode clair"}</span>
        </button>
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
          <span className={styles.mobileTitle}>Pronote · MMI Béziers</span>
          <button className={styles.themeIconBtn} onClick={toggleTheme}>
            {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
          </button>
        </header>

        <main className={styles.main}>
          {/* Décoration MMI — arcs colorés en fond */}
          <div className={styles.mmiDecor} aria-hidden="true">
            <svg viewBox="0 0 340 340" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Arc rose — création */}
              <path d="M170 20 A150 150 0 0 1 320 170" stroke="#ff7cb7" strokeWidth="52" strokeLinecap="round" fill="none"/>
              {/* Arc bleu hachuré — web */}
              <path d="M20 170 A150 150 0 0 0 170 320" stroke="#469cd0" strokeWidth="52" strokeLinecap="round" fill="none" strokeDasharray="8 5"/>
              {/* Arc orange — communication */}
              <path d="M170 320 A150 150 0 0 0 305 230" stroke="#ff8d1a" strokeWidth="52" strokeLinecap="round" fill="none"/>
              {/* Arc rouge — accent */}
              <path d="M305 230 A150 150 0 0 0 320 170" stroke="#ff2e0c" strokeWidth="52" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          {children}
        </main>
        <ChatPanel />

        {/* Bottom nav mobile */}
        <nav className={styles.bottomNav}>
          {navItems.map((item) => {
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
