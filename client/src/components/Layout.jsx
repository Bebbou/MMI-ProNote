import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, BookOpen, BarChart2, Calendar, Settings, LogOut, LayoutGrid, Sun, Menu, X, MessageSquare, FolderOpen, User } from "lucide-react";
import { useTheme, THEMES } from "../hooks/useTheme";
import { useState, useEffect, useRef } from "react";
import ChatPanel from "./ChatPanel";
import MmiDecor from "./MmiDecor";
import { Toaster } from "./Toast";
import logoMmi from "../assets/logo_mmi.jpg";
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

const THEME_DOTS = {
  mmi:      "#fe7db6",
  dark:     "#fe7db6",
  bleu:     "#469cd0",
  pastel:   "#e8609a",
  obsidian: "#9b7fe8",
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef(null);
  const mobileThemeRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      const inSidebar = themeRef.current && themeRef.current.contains(e.target);
      const inMobile = mobileThemeRef.current && mobileThemeRef.current.contains(e.target);
      if (!inSidebar && !inMobile) {
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarTop}>
          <img src={logoMmi} alt="MMI Béziers" className={styles.logo} />
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
        <div className={styles.themePicker} ref={themeRef}>
          <button
            className={`${styles.themeBtn} ${themeOpen ? styles.themeBtnOpen : ""}`}
            onClick={() => setThemeOpen(v => !v)}
          >
            <Sun size={13} strokeWidth={1.5} />
            <span className={styles.navLabel}>
              {THEMES.find(t => t.id === theme)?.label ?? "Theme"}
            </span>
          </button>
          {themeOpen && (
            <div className={styles.themeDropdown}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  className={`${styles.themeItem} ${theme === t.id ? styles.themeItemActive : ""}`}
                  onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                >
                  <span className={styles.themeDot} style={{ background: THEME_DOTS[t.id] }} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
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
          <span className={styles.navLabel}>Deconnexion</span>
        </button>
      </aside>

      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}

      <div className={styles.content}>
        <header className={styles.mobileHeader}>
          <button className={styles.menuBtn} onClick={() => setMenuOpen(true)} aria-label="Menu">
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <span className={styles.mobileTitle}>Pronote-MMI</span>
          <div className={styles.mobileThemePicker} ref={mobileThemeRef}>
            <button
              className={`${styles.themeIconBtn} ${themeOpen ? styles.themeIconBtnOpen : ""}`}
              onClick={() => setThemeOpen(v => !v)}
              aria-label="Changer de thème"
            >
              <Sun size={18} strokeWidth={1.5} />
            </button>
            {themeOpen && (
              <div className={styles.mobileThemeDropdown}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    className={`${styles.themeItem} ${theme === t.id ? styles.themeItemActive : ""}`}
                    onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                  >
                    <span className={styles.themeDot} style={{ background: THEME_DOTS[t.id] }} />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <MmiDecor />
        <Toaster />
        <main className={styles.main}>{children}</main>
        <ChatPanel />

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
