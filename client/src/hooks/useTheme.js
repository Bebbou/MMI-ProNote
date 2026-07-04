import { useState, useEffect } from "react";

export const THEMES = [
  { id: "mmi",      label: "MMI",      dark: false },
  { id: "dark",     label: "Sombre",   dark: true  },
  { id: "bleu",     label: "Bleu",     dark: false },
  { id: "pastel",   label: "Pastel",   dark: false },
  { id: "obsidian", label: "Obsidian", dark: true  },
];

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("theme");
    return THEMES.find(t => t.id === saved) ? saved : "mmi";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function setTheme(id) {
    setThemeState(id);
  }

  // Rétrocompat : toggleTheme bascule entre mmi et dark
  function toggleTheme() {
    setTheme(theme === "dark" || theme === "obsidian" ? "mmi" : "dark");
  }

  const isDark = THEMES.find(t => t.id === theme)?.dark ?? false;

  return { theme, setTheme, toggleTheme, isDark };
}
