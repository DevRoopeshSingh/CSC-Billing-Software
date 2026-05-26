"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api, ApiError } from "@/lib/api-client";
import { API } from "@/lib/api-routes";
import { useToast } from "@/components/Toast";
import { formatCurrency } from "@/lib/formatters";
import { buildCsv, downloadCsv, type CsvColumn } from "@/lib/csv";
import { Loader2, Calendar, TrendingUp, Users, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

type Preset = "last7" | "thisMonth" | "last30";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetRange(preset: Preset): { start: string; end: string } {
  const now = new Date();
  if (preset === "last7") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { start: isoDate(start), end: isoDate(now) };
  }
  if (preset === "thisMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: isoDate(start), end: isoDate(now) };
  }
  if (preset === "last30") {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { start: isoDate(start), end: isoDate(now) };
  }
  return { start: isoDate(now), end: isoDate(now) };
}

type OperatorPerf = {
  username: string;
  role: string;
  invoiceCount: number;
  revenue: number;
};

type RevenueTrend = {
  date: string;
  revenue: number;
  invoiceCount: number;
};

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [preset, setPreset] = useState<Preset>("last30");
  const [range, setRange] = useState(() => presetRange("last30"));
  const [loading, setLoading] = useState(true);

  const [operatorPerf, setOperatorPerf] = useState<OperatorPerf[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrend[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [op, rt] = await Promise.all([
        api.get<OperatorPerf[]>(`${API.REPORTS_OPERATOR_PERFORMANCE}?start=${range.start}&end=${range.end}`),
        api.get<RevenueTrend[]>(`${API.REPORTS_REVENUE_TRENDS}?start=${range.start}&end=${range.end}`),
      ]);
      setOperatorPerf(op || []);
      setRevenueTrends(rt || []);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to load analytics", "error");
    } finally {
      setLoading(false);
    }
  }, [range, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const choosePreset = (p: Preset) => {
    setPreset(p);
    setRange(presetRange(p));
  };

  const handleExport = () => {
    try {
      if (revenueTrends.length > 0) {
        const columns: CsvColumn<RevenueTrend>[] = [
          { header: "Date", get: (r) => r.date },
          { header: "Revenue", get: (r) => r.revenue },
          { header: "Invoices", get: (r) => r.invoiceCount },
        ];
        const { csv } = buildCsv(revenueTrends, columns);
        downloadCsv(`revenue_trends_${range.start}_${range.end}.csv`, csv);
      }

      if (operatorPerf.length > 0) {
        const columns: CsvColumn<OperatorPerf>[] = [
          { header: "Operator", get: (r) => r.username },
          { header: "Role", get: (r) => r.role },
          { header: "Invoices", get: (r) => r.invoiceCount },
          { header: "Revenue", get: (r) => r.revenue },
        ];
        const { csv } = buildCsv(operatorPerf, columns);
        downloadCsv(`operator_performance_${range.start}_${range.end}.csv`, csv);
      }

      if (revenueTrends.length > 0 || operatorPerf.length > 0) {
        toast("Exported analytics to CSV", "success");
      } else {
        toast("No data to export", "info");
      }
    } catch (err) {
      toast("Failed to export analytics", "error");
    }
  };

  const presetButton = (key: Preset, label: string) => (
    <button
      type="button"
      onClick={() => choosePreset(key)}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        preset === key ? "bg-primary text-white" : "text-muted-foreground hover:bg-background"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize revenue trends and operator performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-primary px-4 py-2",
              "text-[13px] font-medium text-white transition-colors hover:bg-primary-dark",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <Download className="h-4 w-4 text-white" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">
          {presetButton("last7", "Last 7 days")}
          {presetButton("last30", "Last 30 days")}
          {presetButton("thisMonth", "This Month")}
        </div>
        <div className="md:ml-auto flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={range.start}
            onChange={(e) => { setPreset("last30"); setRange(r => ({ ...r, start: e.target.value })); }}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={range.end}
            onChange={(e) => { setPreset("last30"); setRange(r => ({ ...r, end: e.target.value })); }}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Daily Revenue Trends
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrends} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value) || 0), "Revenue"]}
                    labelStyle={{ color: '#111827' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                Operator Performance
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operatorPerf} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="username" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    formatter={(value: any, name: any) => [name === 'revenue' ? formatCurrency(Number(value) || 0) : value, name === 'revenue' ? 'Revenue' : 'Invoices']}
                    labelStyle={{ color: '#111827' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
