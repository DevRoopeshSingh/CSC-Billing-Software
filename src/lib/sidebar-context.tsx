"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type SidebarContextType = {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // 1. Hydration Fix: Lazy initialization for SPA / Electron
  // We wrap this in a try-catch for safety during potential Next.js SSR
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("csc_sidebar_collapsed") === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("csc_sidebar_collapsed", isSidebarCollapsed.toString());
    }
  }, [isSidebarCollapsed, isMounted]);

  // Handle Ctrl+B / Cmd+B and Window Resize
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 2. Prevent triggering if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (window.innerWidth < 1024) {
          setIsSidebarOpen((prev) => !prev);
        } else {
          setIsSidebarCollapsed((prev) => !prev);
        }
      }
    };

    // 3. Auto-close mobile overlay if window resizes to desktop
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Prevent rendering flash before mount (optional depending on SSR needs)
  // If this is pure Electron, the lazy init above is enough.
  
  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        isSidebarCollapsed,
        toggleSidebar,
        closeSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
