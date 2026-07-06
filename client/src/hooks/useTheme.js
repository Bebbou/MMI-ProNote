import { useState, useEffect } from "react";

export const THEMES = [
  { id: "mmi", label: "MMI" },
  { id: "dark", label: "Sombre" },
  { id: "bleu", label: "Bleu" },
  { id: "pastel", label: "Pastel" },
  { id: "obsidian", label: "Obsidian" },
];

const VALID = THEMES.map((t) => t.id);

function getSaved() {
  const v = localStorage.getItem("theme");
  if (v === "light") return "mmi"; // rétrocompat
  return VALID.includes(v) ? v : "mmi";
}

export function useTheme() {
  const [theme, setThemeState] = useState(getSaved);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function setTheme(id) {
    if (VALID.includes(id)) setThemeState(id);
  }

  return { theme, setTheme };
}
