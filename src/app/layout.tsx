// src/renderer/app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ToastProvider } from "@/components/Toast";
import { BridgeStatusBanner } from "@/components/BridgeStatusBanner";
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
  Menu,
  Sun,
  Moon,
  Monitor,
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

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { SetupScreen } from "@/components/auth/SetupScreen";
import { LogOut } from "lucide-react";

// ── Sidebar ──────────────────────────────────────────────────────────────────
function SidebarNav() {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const { user } = useAuth();
  const { isSidebarOpen, isSidebarCollapsed, closeSidebar } = useSidebar();

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

  type NavItem = {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    roles?: readonly string[];
  };
  const navSections: { label: string; items: NavItem[] }[] = [
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
        { href: "/settings/backup", label: "Backup", icon: HardDrive, roles: ["admin"] },
        { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "staff"] },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-gray-900 text-white select-none transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "w-[64px]" : "w-[var(--sidebar-w)]",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold">
              C
            </div>
            <div
              className={cn(
                "transition-all duration-300",
                isSidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              <h1 className="text-[15px] font-bold leading-tight text-white">
                CSC Billing
              </h1>
              <span className="block text-[11px] text-white/45">
                Local System
              </span>
            </div>
          </div>
        </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.role))
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-1">
              {!isSidebarCollapsed && (
                <p className="px-5 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-white/30 truncate">
                  {section.label}
                </p>
              )}
              {isSidebarCollapsed && <div className="pt-4" />}
              {visibleItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={cn(
                      "mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-primary text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white",
                      isSidebarCollapsed && "justify-center px-0"
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="mt-auto border-t border-white/10 px-5 py-3">
        <div className={cn("flex items-center gap-2 text-[13px]", isSidebarCollapsed && "justify-center")}>
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-red-400" />
          )}
          {!isSidebarCollapsed && (
            <span
              className={cn(
                "truncate",
                isOnline ? "text-white/50" : "font-semibold text-red-400"
              )}
            >
              {isOnline ? "Online" : "Offline Mode"}
            </span>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}

// ── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  // Prevent hydration mismatch by rendering a generic icon until mounted
  if (!mounted) {
    return (
      <button className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background">
        <div className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <button
      onClick={cycleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background"
      title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
    >
      {theme === "light" && <Sun className="h-[18px] w-[18px]" />}
      {theme === "dark" && <Moon className="h-[18px] w-[18px]" />}
      {theme === "system" && <Monitor className="h-[18px] w-[18px]" />}
    </button>
  );
}

// ── Topbar ───────────────────────────────────────────────────────────────────
function TopBar() {
  const pathname = usePathname();
  const [dateStr, setDateStr] = useState("");
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();

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
    if (pathname.startsWith("/settings/users")) return "Users & Roles";
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
      <div className="flex items-center gap-3 [-webkit-app-region:no-drag]">
        <button
          onClick={toggleSidebar}
          className="mr-2 rounded p-2 hover:bg-muted text-muted-foreground transition-colors"
          title="Toggle Sidebar (Ctrl+B)"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
          <p className="text-xs text-muted-foreground">{dateStr}</p>
        </div>
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

        {/* Theme Toggle */}
        <ThemeToggle />

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
        {user?.role !== "viewer" && (
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
        )}

        {/* Avatar & User */}
        <div className="ml-1 flex items-center gap-2.5 border-l border-border pl-4">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full bg-primary",
              "text-sm font-semibold text-white uppercase"
            )}
          >
            {user?.username.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-foreground">
              {user?.username}
            </span>
            <span className="text-[11px] text-muted-foreground uppercase">
              {user?.role}
            </span>
          </div>
          
          {/* Logout */}
          <button 
            onClick={logout}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isFirstRun, loading } = useAuth();
  const { isSidebarCollapsed } = useSidebar();

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background">Loading...</div>;
  }

  if (isFirstRun) {
    return <SetupScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarNav />
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 ease-in-out w-full",
          isSidebarCollapsed ? "lg:ml-[64px]" : "lg:ml-[var(--sidebar-w)]"
        )}
      >
        <TopBar />
        <BridgeStatusBanner />
        <main className="flex-1 overflow-y-auto bg-background p-7">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </SidebarProvider>
    </ThemeProvider>
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem("csc_theme") || "system";
                if (theme === "system") {
                  theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                }
                document.documentElement.setAttribute("data-theme", theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ToastProvider>
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
