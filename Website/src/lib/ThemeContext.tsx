import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeId = "light-indigo" | "void-black" | "obsidian-gold" | "cyber-mint" | "nebula-violet" | "monolith-gray" | "crimson-eclipse" | "cyberpunk-edge" | "neon-synth" | "solar-flare" | "liquid-glass";

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
    "--th-glass-blur": string;
    "--th-glass-opacity": string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "light-indigo",
    label: "Light Indigo",
    swatches: ["#ffffff", "#4f46e5", "#f8fafc"],
    vars: {
      "--th-bg": "#ffffff",
      "--th-surface": "#ffffff",
      "--th-surface-low": "#f8fafc",
      "--th-surface-high": "#f1f5f9",
      "--th-surface-top": "#e2e8f0",
      "--th-accent": "#4f46e5",
      "--th-accent-text": "#ffffff",
      "--th-secondary": "#818cf8",
      "--th-text": "#0f172a",
      "--th-muted": "#64748b",
      "--th-border": "#e2e8f0",
      "--th-glow": "rgba(79,70,229,0.1)",
      "--th-glass-blur": "24px",
      "--th-glass-opacity": "0.8",
    },
  },
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
      "--th-glass-blur": "12px",
      "--th-glass-opacity": "0.1",
    },
  },
  {
    id: "void-black",
    label: "Void Black",
    swatches: ["#000000", "#ffe792", "#1a1a1a"],
    vars: {
      "--th-bg": "#000000",
      "--th-surface": "#0d0d0d",
      "--th-surface-low": "#080808",
      "--th-surface-high": "#161616",
      "--th-surface-top": "#1f1f1f",
      "--th-accent": "#ffe792",
      "--th-accent-text": "#1a0e00",
      "--th-secondary": "#a2c2fd",
      "--th-text": "#f0f0f0",
      "--th-muted": "#666666",
      "--th-border": "rgba(255,255,255,0.07)",
      "--th-glow": "rgba(255,231,146,0.12)",
      "--th-glass-blur": "16px",
      "--th-glass-opacity": "0.06",
    },
  },
  {
    id: "liquid-glass",
    label: "Liquid Glass",
    swatches: ["#e0f2fe", "#0284c7", "#bae6fd"],
    vars: {
      "--th-bg": "#f0f9ff",
      "--th-surface": "rgba(224, 242, 254, 0.4)",
      "--th-surface-low": "rgba(240, 249, 255, 0.5)",
      "--th-surface-high": "rgba(186, 230, 253, 0.5)",
      "--th-surface-top": "rgba(125, 211, 252, 0.6)",
      "--th-accent": "#0284c7",
      "--th-accent-text": "#ffffff",
      "--th-secondary": "#0ea5e9",
      "--th-text": "#082f49",
      "--th-muted": "#0369a1",
      "--th-border": "rgba(2,132,199,0.15)",
      "--th-glow": "rgba(2,132,199,0.1)",
      "--th-glass-blur": "40px",
      "--th-glass-opacity": "0.4",
    },
  },
];

interface ThemeContextValue {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: "light-indigo",
  theme: THEMES[0],
  setTheme: () => { },
});

function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Dynamically update the global Favicon to an SVG referencing the current theme's accent color
  const accentColor = theme.vars["--th-accent"].replace(/#/g, '%23');
  const svgFavicon = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%23000"/><circle cx="30" cy="55" r="18" fill="${accentColor}"/><circle cx="56" cy="40" r="24" fill="${accentColor}" fill-opacity="0.8"/><circle cx="78" cy="58" r="14" fill="${accentColor}" fill-opacity="0.6"/></svg>`;

  let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.href = svgFavicon;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const saved = (localStorage.getItem("bubble-theme") as ThemeId) || "light-indigo";
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
