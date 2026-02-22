/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cloud-desk-theme-mode";
const THEME_LIGHT = "cloud-light";
const THEME_DARK = "cloud-dark";

const ThemeContext = createContext(null);

const getSystemTheme = () => {
  if (typeof window === "undefined") return THEME_LIGHT;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? THEME_DARK : THEME_LIGHT;
};

const resolveTheme = (mode) => {
  if (mode === "light") return THEME_LIGHT;
  if (mode === "dark") return THEME_DARK;
  return getSystemTheme();
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "system";
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    return persisted === "light" || persisted === "dark" || persisted === "system"
      ? persisted
      : "system";
  });
  const [theme, setTheme] = useState(() => resolveTheme(mode));

  useEffect(() => {
    const nextTheme = resolveTheme(mode);
    setTheme(nextTheme);

    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme);
      document.documentElement.style.colorScheme = nextTheme === THEME_DARK ? "dark" : "light";
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (mode !== "system") return;
      setTheme(resolveTheme("system"));
      document.documentElement.setAttribute("data-theme", resolveTheme("system"));
      document.documentElement.style.colorScheme =
        resolveTheme("system") === THEME_DARK ? "dark" : "light";
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      theme,
      setMode,
      isDark: theme === THEME_DARK,
    }),
    [mode, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
