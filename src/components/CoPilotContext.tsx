"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface CoPilotContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CoPilotCtx = createContext<CoPilotContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function useCoPilot() {
  return useContext(CoPilotCtx);
}

export function CoPilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <CoPilotCtx.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </CoPilotCtx.Provider>
  );
}
