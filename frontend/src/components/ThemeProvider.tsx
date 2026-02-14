import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface AccentColor {
  name: string;
  primary: string;
  primaryDark: string;
  glow: string;
  glowDark: string;
  preview: string; // for the swatch
}

export const ACCENT_COLORS: AccentColor[] = [
  { name: "Cyan",    primary: "185 72% 45%", primaryDark: "185 72% 48%", glow: "195 80% 50%", glowDark: "195 80% 55%", preview: "hsl(185 72% 48%)" },
  { name: "Violet",  primary: "262 72% 55%", primaryDark: "262 72% 60%", glow: "280 80% 60%", glowDark: "280 80% 65%", preview: "hsl(262 72% 58%)" },
  { name: "Rose",    primary: "345 72% 50%", primaryDark: "345 72% 55%", glow: "355 80% 58%", glowDark: "355 80% 62%", preview: "hsl(345 72% 52%)" },
  { name: "Amber",   primary: "38 92% 50%",  primaryDark: "38 92% 55%",  glow: "25 100% 55%", glowDark: "25 100% 60%", preview: "hsl(38 92% 52%)" },
  { name: "Emerald", primary: "160 72% 38%", primaryDark: "160 72% 42%", glow: "150 80% 45%", glowDark: "150 80% 50%", preview: "hsl(160 72% 40%)" },
  { name: "Blue",    primary: "220 72% 50%", primaryDark: "220 72% 55%", glow: "230 80% 58%", glowDark: "230 80% 62%", preview: "hsl(220 72% 52%)" },
];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  accentIndex: number;
  setAccentIndex: (i: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
};

const applyAccent = (accent: AccentColor, isDark: boolean) => {
  const root = document.documentElement;
  root.style.setProperty("--primary", isDark ? accent.primaryDark : accent.primary);
  root.style.setProperty("--ring", isDark ? accent.primaryDark : accent.primary);
  root.style.setProperty("--accent", isDark ? accent.primaryDark : accent.primary);
  root.style.setProperty("--glow-primary", isDark ? accent.primaryDark : accent.primary);
  root.style.setProperty("--glow-secondary", isDark ? accent.glowDark : accent.glow);
  root.style.setProperty("--sidebar-primary", isDark ? accent.primaryDark : accent.primary);
  root.style.setProperty("--sidebar-ring", isDark ? accent.primaryDark : accent.primary);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("shufflefin-theme") as Theme) || "dark";
    }
    return "dark";
  });

  const [accentIndex, setAccentIndexState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("shufflefin-accent") || "0", 10);
    }
    return 0;
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("shufflefin-theme", t);
  };

  const setAccentIndex = (i: number) => {
    setAccentIndexState(i);
    localStorage.setItem("shufflefin-accent", String(i));
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    applyAccent(ACCENT_COLORS[accentIndex], theme === "dark");
  }, [theme, accentIndex]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentIndex, setAccentIndex }}>
      {children}
    </ThemeContext.Provider>
  );
};
