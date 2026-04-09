import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeId = "obsidian-gold" | "cyber-mint" | "nebula-violet" | "monolith-gray" | "crimson-eclipse";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  swatches: string[];
  vars: {
    "--th-bg": string;
    "--th-surface": string;
    "--th-surface-low": string;
    "--th-surface-high": string;
    "--th-surface-top": string;
    "--th-accent": string;
    "--th-accent-text": string;
    "--th-secondary": string;
    "--th-text": string;
    "--th-muted": string;
    "--th-border": string;
    "--th-glow": string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "obsidian-gold",
    label: "Obsidian Gold",
    swatches: ["#010f20", "#ffe792", "#a2c2fd"],
    vars: {
      "--th-bg": "#010f20",
      "--th-surface": "#071a2f",
      "--th-surface-low": "#031427",
      "--th-surface-high": "#0c2037",
      "--th-surface-top": "#11273f",
      "--th-accent": "#ffe792",
      "--th-accent-text": "#655400",
      "--th-secondary": "#a2c2fd",
      "--th-text": "#d8e6ff",
      "--th-muted": "#9eacc3",
      "--th-border": "rgba(59,73,92,0.15)",
      "--th-glow": "rgba(255,231,146,0.15)",
    },
  },
  {
    id: "cyber-mint",
    label: "Cyber Mint",
    swatches: ["#020b08", "#64ffda", "#0c1f18"],
    vars: {
      "--th-bg": "#020b08",
      "--th-surface": "#0c1f18",
      "--th-surface-low": "#061510",
      "--th-surface-high": "#122e23",
      "--th-surface-top": "#1a4030",
      "--th-accent": "#64ffda",
      "--th-accent-text": "#003323",
      "--th-secondary": "#a8b2d1",
      "--th-text": "#e6f1ff",
      "--th-muted": "#8892b0",
      "--th-border": "rgba(100,255,218,0.15)",
      "--th-glow": "rgba(100,255,218,0.15)",
    },
  },
  {
    id: "nebula-violet",
    label: "Nebula Violet",
    swatches: ["#0a0212", "#f0abfc", "#1d0833"],
    vars: {
      "--th-bg": "#0a0212",
      "--th-surface": "#1d0833",
      "--th-surface-low": "#120321",
      "--th-surface-high": "#2b0a4a",
      "--th-surface-top": "#3a1061",
      "--th-accent": "#f0abfc",
      "--th-accent-text": "#2a003e",
      "--th-secondary": "#d8b4fe",
      "--th-text": "#faf5ff",
      "--th-muted": "#c0aadd",
      "--th-border": "rgba(240,171,252,0.15)",
      "--th-glow": "rgba(240,171,252,0.15)",
    },
  },
  {
    id: "monolith-gray",
    label: "Monolith Gray",
    swatches: ["#0a0a0a", "#e5e5e5", "#1f1f1f"],
    vars: {
      "--th-bg": "#0a0a0a",
      "--th-surface": "#1f1f1f",
      "--th-surface-low": "#141414",
      "--th-surface-high": "#2e2e2e",
      "--th-surface-top": "#3d3d3d",
      "--th-accent": "#e5e5e5",
      "--th-accent-text": "#111111",
      "--th-secondary": "#a3a3a3",
      "--th-text": "#f5f5f5",
      "--th-muted": "#737373",
      "--th-border": "rgba(229,229,229,0.12)",
      "--th-glow": "rgba(229,229,229,0.1)",
    },
  },
  {
    id: "crimson-eclipse",
    label: "Crimson Eclipse",
    swatches: ["#0f0202", "#ef4444", "#240404"],
    vars: {
      "--th-bg": "#0f0202",
      "--th-surface": "#240404",
      "--th-surface-low": "#1a0303",
      "--th-surface-high": "#3a0606",
      "--th-surface-top": "#500909",
      "--th-accent": "#ef4444",
      "--th-accent-text": "#3a0000",
      "--th-secondary": "#fca5a5",
      "--th-text": "#fef2f2",
      "--th-muted": "#f87171",
      "--th-border": "rgba(239,68,68,0.15)",
      "--th-glow": "rgba(239,68,68,0.15)",
    },
  },
];

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: "obsidian-gold",
  theme: THEMES[0],
  setTheme: () => {},
});

function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const saved = (localStorage.getItem("bubble-theme") as ThemeId) || "obsidian-gold";
  const [themeId, setThemeId] = useState<ThemeId>(saved);

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (id: ThemeId) => {
    localStorage.setItem("bubble-theme", id);
    setThemeId(id);
  };

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
