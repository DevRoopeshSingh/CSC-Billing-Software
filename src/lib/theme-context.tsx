"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("csc_theme") as Theme;
        if (stored === "light" || stored === "dark" || stored === "system") {
          return stored;
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("csc_theme");
        if (stored === "dark" || stored === "light") return stored as "light" | "dark";
      } catch {
        // Ignore localStorage errors
      }
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const applyTheme = (currentTheme: Theme) => {
      let resolved: "light" | "dark";
      if (currentTheme === "system") {
        resolved = mediaQuery.matches ? "dark" : "light";
      } else {
        resolved = currentTheme;
      }
      
      setResolvedTheme(resolved);
      root.setAttribute("data-theme", resolved);
    };

    // Apply initially and when theme state changes
    applyTheme(theme);

    // Listen for system changes if current theme is system
    const handleSystemChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    // Listen for cross-tab storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "csc_theme" && e.newValue) {
        setThemeState(e.newValue as Theme);
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      mediaQuery.removeEventListener("change", handleSystemChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("csc_theme", newTheme);
    } catch {
      // Ignore errors
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
