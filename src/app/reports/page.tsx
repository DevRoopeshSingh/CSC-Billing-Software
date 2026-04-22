// src/app/reports/page.tsx
"use client";

import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, Calendar, Users } from "lucide-react";

const UPCOMING = [
  {
    icon: Calendar,
    title: "Daily revenue",
    description:
      "Today's collections, invoice count, and payment-mode breakdown.",
  },
  {
    icon: TrendingUp,
    title: "Date range analytics",
    description:
      "Revenue, tax, and discount totals over any custom date range with a revenue trend chart.",
  },
  {
    icon: BarChart3,
    title: "Top services",
    description: "Most-billed services ranked by revenue and quantity.",
  },
  {
    icon: Users,
    title: "Customer leaderboard",
    description: "Highest-value customers by total billings and frequency.",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, service, and customer analytics powered by your local data.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Reports are coming soon
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            The backend data for reports is already available. The UI for
            visualizing it is scheduled for the next release.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {UPCOMING.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={cn(
                "flex gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
