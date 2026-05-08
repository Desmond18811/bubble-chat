import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeId = "void-black" | "obsidian-gold" | "cyber-mint" | "nebula-violet" | "monolith-gray" | "crimson-eclipse" | "cyberpunk-edge" | "neon-synth" | "solar-flare" | "liquid-glass";

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
      "--th-glass-blur": "16px",
      "--th-glass-opacity": "0.08",
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
      "--th-glass-blur": "20px",
      "--th-glass-opacity": "0.12",
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
      "--th-glass-blur": "8px",
      "--th-glass-opacity": "0.05",
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
      "--th-glass-blur": "14px",
      "--th-glass-opacity": "0.08",
    },
  },
  {
    id: "cyberpunk-edge",
    label: "Cyberpunk Edge",
    swatches: ["#09090b", "#fde047", "#18181b"],
    vars: {
      "--th-bg": "#09090b",
      "--th-surface": "#18181b",
      "--th-surface-low": "#0f0f12",
      "--th-surface-high": "#27272a",
      "--th-surface-top": "#3f3f46",
      "--th-accent": "#fde047",
      "--th-accent-text": "#422006",
      "--th-secondary": "#e879f9",
      "--th-text": "#fafafa",
      "--th-muted": "#a1a1aa",
      "--th-border": "rgba(253,224,71,0.15)",
      "--th-glow": "rgba(232,121,249,0.2)",
      "--th-glass-blur": "12px",
      "--th-glass-opacity": "0.1",
    },
  },
  {
    id: "neon-synth",
    label: "Neon Synth",
    swatches: ["#020024", "#00d4ff", "#090979"],
    vars: {
      "--th-bg": "#020024",
      "--th-surface": "#090979",
      "--th-surface-low": "#050549",
      "--th-surface-high": "#1212a4",
      "--th-surface-top": "#1a1acb",
      "--th-accent": "#00d4ff",
      "--th-accent-text": "#002a33",
      "--th-secondary": "#f80077",
      "--th-text": "#ffffff",
      "--th-muted": "#7cb7d5",
      "--th-border": "rgba(0,212,255,0.2)",
      "--th-glow": "rgba(248,0,119,0.2)",
      "--th-glass-blur": "18px",
      "--th-glass-opacity": "0.1",
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
  themeId: "obsidian-gold",
  theme: THEMES[1],
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
