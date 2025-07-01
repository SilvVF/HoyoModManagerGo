import { darkThemePref, usePrefrenceAsState } from "@/data/prefs";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  isDark: boolean;
  scheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setScheme: (themeKey: ColorScheme) => void;
  setPreview: (scheme: ColorScheme) => void;
  clearPreview: (scheme: ColorScheme) => void;
};

const sKey = "THEME_KEY";

type ColorScheme = "catapuccin" | "mono" | "doom" | "bubblegum" | "kodama";

export const Schemes: ColorScheme[] = [
  "catapuccin",
  "mono",
  "doom",
  "bubblegum",
  "kodama",
];

const initialScheme = (): ColorScheme => {
  const item = localStorage.getItem(sKey);
  if (item && Schemes.map((it) => String(it)).includes(item)) {
    return item as ColorScheme;
  } else {
    return "catapuccin";
  }
};

const initialState: ThemeProviderState = {
  theme: (localStorage.getItem("last_theme") ?? "system") as Theme,
  isDark: localStorage.getItem("last_dark") === "true",
  scheme: initialScheme(),
  setTheme: () => null,
  setScheme: () => null,
  setPreview: () => null,
  clearPreview: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [theme, setTheme] = usePrefrenceAsState(darkThemePref);
  const [isDark, setIsDark] = useState(false);

  const [scheme, setScheme] = useState<ColorScheme>(initialScheme());
  const [preview, setPreview] = useState<ColorScheme | undefined>(undefined);

  const initial = useRef(true);

  useEffect(() => {
    const time = 100;
    initial.current = false;

    const id = setTimeout(() => {
      if (theme === undefined) return;

      const root = window.document.documentElement;
      localStorage.setItem(sKey, scheme);

      for (const key of Schemes) {
        root.classList.remove(key + "-" + "dark", key + "-" + "light");
      }

      const currentScheme = preview !== undefined ? preview : scheme;
      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";

        setIsDark(systemTheme === "dark");
        root.classList.add(currentScheme + "-" + systemTheme);
      } else {
        setIsDark(theme === "dark");
        root.classList.add(currentScheme + "-" + theme);
      }
    }, time);

    return () => clearTimeout(id);
  }, [theme, scheme, preview]);

  const value = {
    theme: (theme ?? "system") as Theme,
    setTheme: (theme: Theme) => setTheme(theme),
    scheme: scheme,
    isDark: isDark,
    setScheme: setScheme,
    clearPreview: (s: ColorScheme) =>
      setPreview((p) => (s === p ? undefined : p)),
    setPreview: setPreview,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
