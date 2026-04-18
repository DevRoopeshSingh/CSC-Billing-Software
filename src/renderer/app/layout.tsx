// src/renderer/app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Users,
  Briefcase,
  BarChart3,
  HardDrive,
  Settings,
  Search,
  Bell,
  Plus,
  Wifi,
  WifiOff,
} from "lucide-react";

// ── Navigation Config ────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/billing/new", label: "New Invoice", icon: FilePlus },
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/services", label: "Services", icon: Briefcase },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
  },
  {
    label: "System",
    items: [
      { href: "/settings/backup", label: "Backup", icon: HardDrive },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// ── Sidebar ──────────────────────────────────────────────────────────────────
function SidebarNav() {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border",
        "bg-gray-900 text-white select-none"
      )}
      style={{ width: "var(--sidebar-w)" }}
    >
      {/* Brand */}
      <div className="border-b border-white/10 px-5 pb-4 pt-5">
        <h1 className="text-[15px] font-bold leading-tight text-white">
          CSC Billing
        </h1>
        <span className="mt-0.5 block text-[11px] text-white/45">
          Local Management System
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="px-5 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-primary text-white"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Status Footer */}
      <div className="border-t border-white/10 px-5 py-3">
        <div className="flex items-center gap-2 text-[13px]">
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
          )}
          <span
            className={cn(
              isOnline ? "text-white/50" : "font-semibold text-red-400"
            )}
          >
            {isOnline ? "Online" : "Offline Mode"}
          </span>
        </div>
      </div>
    </aside>
  );
}

// ── Topbar ───────────────────────────────────────────────────────────────────
function TopBar() {
  const pathname = usePathname();
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(format(new Date(), "EEEE, MMM d, yyyy"));
  }, []);

  const pageTitle = (() => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/billing/new")) return "New Invoice";
    if (pathname.startsWith("/invoices")) return "Invoices";
    if (pathname.startsWith("/customers")) return "Customers";
    if (pathname.startsWith("/services")) return "Services";
    if (pathname.startsWith("/reports")) return "Reports";
    if (pathname.startsWith("/settings/backup")) return "Backup";
    if (pathname.startsWith("/settings")) return "Settings";
    return "CSC Billing";
  })();

  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center justify-between border-b border-border px-8",
        "bg-surface [-webkit-app-region:drag]"
      )}
    >
      <div className="[-webkit-app-region:no-drag]">
        <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
        <p className="text-xs text-muted-foreground">{dateStr}</p>
      </div>

      <div className="flex items-center gap-3 [-webkit-app-region:no-drag]">
        {/* Search */}
        <button
          className={cn(
            "flex items-center gap-2.5 rounded-full border border-border bg-background px-4 py-2",
            "text-[13px] text-muted-foreground transition-colors hover:border-primary"
          )}
          style={{ width: 220 }}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search...</span>
          <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px]">
            ⌘K
          </kbd>
        </button>

        {/* Notification */}
        <button
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground",
            "transition-colors hover:bg-background"
          )}
        >
          <Bell className="h-[18px] w-[18px]" />
        </button>

        {/* New Invoice CTA */}
        <Link
          href="/billing/new"
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5",
            "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
          )}
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>

        {/* Avatar */}
        <div className="ml-1 flex items-center gap-2.5 border-l border-border pl-4">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-primary",
              "text-sm font-semibold text-white"
            )}
          >
            A
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-foreground">
              Admin
            </span>
            <span className="text-[11px] text-muted-foreground">
              CSC Center
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ── Root Layout ──────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>CSC Billing Software</title>
        <meta
          name="description"
          content="Local billing and invoice management for your CSC center"
        />
      </head>
      <body>
        <div className="flex h-screen overflow-hidden bg-background">
          <SidebarNav />
          <div
            className="flex flex-1 flex-col"
            style={{ marginLeft: "var(--sidebar-w)" }}
          >
            <TopBar />
            <main className="flex-1 overflow-y-auto bg-background p-7">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
