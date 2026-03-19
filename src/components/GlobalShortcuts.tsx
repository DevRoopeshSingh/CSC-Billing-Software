"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
         if (e.key.toLowerCase() !== "s" && e.key.toLowerCase() !== "p") return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
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
              // The forms on those pages should handle submit event natively if there's a submit button 
              // but we can trigger a form submission manually
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
  }, [router, pathname]);

  return null;
}
