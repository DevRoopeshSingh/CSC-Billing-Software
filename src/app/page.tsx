// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ipc } from "@/lib/ipc";
import { IPC } from "@/shared/ipc-channels";
import { useToast } from "@/components/Toast";
import BookmarkedServices from "@/components/BookmarkedServices";
import type { Customer, Service, InvoiceDetail } from "@/shared/types";
import {
  IndianRupee,
  Users,
  FileWarning,
  Briefcase,
  FilePlus,
  UserPlus,
  BarChart3,
  HardDrive,
  ArrowUpRight,
  Clock,
  TrendingUp,
} from "lucide-react";

interface DashboardStats {
  todayRevenue: number;
  todayInvoiceCount: number;
  totalCustomers: number;
  pendingInvoices: number;
  activeServices: number;
  totalRevenue: number;
  recentInvoices: Array<{
    id: number;
    invoiceNo: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string | Date;
  }>;
}

const EMPTY_STATS: DashboardStats = {
  todayRevenue: 0,
  todayInvoiceCount: 0,
  totalCustomers: 0,
  pendingInvoices: 0,
  activeServices: 0,
  totalRevenue: 0,
  recentInvoices: [],
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "teal",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: "teal" | "blue" | "amber" | "emerald";
}) {
  const accentMap = {
    teal: "bg-teal-50 text-teal-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6",
        "shadow-sm transition-shadow hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={cn("rounded-xl p-3", accentMap[accent])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  description,
  icon: Icon,
  variant = "default",
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  variant?: "default" | "primary";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-xl border p-5 transition-all",
        variant === "primary"
          ? "border-primary/20 bg-primary/5 hover:border-primary hover:bg-primary/10"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
          variant === "primary"
            ? "bg-primary text-white"
            : "bg-background text-muted-foreground group-hover:bg-primary group-hover:text-white"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRight
        className={cn(
          "h-4 w-4 text-muted-foreground opacity-0 transition-all",
          "group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        )}
      />
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        styles[status] ?? "bg-gray-50 text-gray-600 border-gray-200"
      )}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [invoices, customers, services] = await Promise.all([
          ipc<InvoiceDetail[]>(IPC.INVOICES_LIST),
          ipc<Customer[]>(IPC.CUSTOMERS_LIST),
          ipc<Service[]>(IPC.SERVICES_LIST),
        ]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayInvoices = (invoices ?? []).filter((i) => {
          const d = new Date(i.createdAt ?? 0);
          return d >= today;
        });

        setStats({
          todayRevenue: todayInvoices.reduce((s, i) => s + (i.total ?? 0), 0),
          todayInvoiceCount: todayInvoices.length,
          totalCustomers: (customers ?? []).length,
          pendingInvoices: (invoices ?? []).filter((i) => i.status === "PENDING")
            .length,
          activeServices: (services ?? []).filter((s) => s.isActive).length,
          totalRevenue: (invoices ?? []).reduce(
            (s, i) => s + (i.total ?? 0),
            0
          ),
          recentInvoices: (invoices ?? []).slice(0, 8).map((i) => ({
            id: i.id!,
            invoiceNo: i.invoiceNo,
            customerName: i.customer?.name ?? "—",
            total: i.total,
            status: i.status,
            createdAt: i.createdAt ?? new Date(),
          })),
        });
      } catch {
        toast("Unable to load dashboard data", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{greeting}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening at your center today
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/reports"
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5",
              "text-[13px] font-medium text-foreground transition-colors hover:bg-background"
            )}
          >
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Reports
          </Link>
          <Link
            href="/billing/new"
            className={cn(
              "flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5",
              "text-[13px] font-semibold text-white transition-colors hover:bg-primary-dark"
            )}
          >
            <FilePlus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Collection"
          value={loading ? "—" : formatCurrency(stats.todayRevenue)}
          icon={IndianRupee}
          accent="teal"
        />
        <StatCard
          label="Total Customers"
          value={loading ? "—" : String(stats.totalCustomers)}
          icon={Users}
          accent="blue"
        />
        <StatCard
          label="Pending Invoices"
          value={loading ? "—" : String(stats.pendingInvoices)}
          icon={FileWarning}
          accent="amber"
        />
        <StatCard
          label="Active Services"
          value={loading ? "—" : String(stats.activeServices)}
          icon={Briefcase}
          accent="emerald"
        />
      </div>

      <BookmarkedServices />

      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href="/billing/new"
            label="Create Invoice"
            description="Bill a customer for services"
            icon={FilePlus}
            variant="primary"
          />
          <QuickAction
            href="/customers"
            label="Add Customer"
            description="Register a new customer"
            icon={UserPlus}
          />
          <QuickAction
            href="/reports"
            label="View Reports"
            description="Revenue and analytics"
            icon={BarChart3}
          />
          <QuickAction
            href="/settings/backup"
            label="Backup Data"
            description="Export database backup"
            icon={HardDrive}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Revenue Overview
            </h3>
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex items-end justify-between border-b border-border pb-4">
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {loading ? "—" : formatCurrency(stats.todayRevenue)}
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {loading ? "—" : `${stats.todayInvoiceCount} invoices`}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">All Time</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {loading ? "—" : formatCurrency(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Recent Invoices
              </h3>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-medium text-primary hover:underline"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : stats.recentInvoices.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <FileWarning className="h-10 w-10 text-muted-foreground/40" />
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No invoices yet
                </p>
                <Link
                  href="/billing/new"
                  className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                >
                  Create your first invoice
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border/50 last:border-0 hover:bg-background/60"
                    >
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-foreground">
                        {inv.customerName}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-6 py-3.5 text-muted-foreground">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-semibold text-foreground">
                        {formatCurrency(inv.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
