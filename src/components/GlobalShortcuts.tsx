"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCommandPalette } from "./CommandPaletteProvider";
import { useCoPilot } from "./CoPilotContext";

export default function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const commandPalette = useCommandPalette();
  const coPilot = useCoPilot();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
         if (!["s", "p", "k", "j"].includes(e.key.toLowerCase())) return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "k":
            e.preventDefault();
            commandPalette.toggle();
            break;
          case "j":
            e.preventDefault();
            coPilot.toggle();
            break;
          case "d":
            e.preventDefault();
            router.push("/");
            break;
          case "i":
            e.preventDefault();
            router.push("/invoices");
            break;
          case "n":
            e.preventDefault();
            router.push("/billing/new");
            break;
          case "p":
            if (pathname.includes("/invoice/")) {
              e.preventDefault();
              window.print();
            }
            break;
          case "s":
            if (pathname === "/billing/new" || pathname === "/center" || pathname === "/settings") {
              const form = document.querySelector("form");
              if (form) {
                e.preventDefault();
                form.requestSubmit();
              }
            }
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname, commandPalette, coPilot]);

  return null;
}

