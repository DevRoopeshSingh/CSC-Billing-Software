// src/app/settings/page.tsx
"use client";

import { cn } from "@/lib/utils";
import { Settings, Building2, Image, Receipt, Lock } from "lucide-react";

const UPCOMING = [
  {
    icon: Building2,
    title: "Center profile",
    description:
      "Center name, address, contact details, Udyam number, and tagline.",
  },
  {
    icon: Image,
    title: "Branding",
    description: "Upload your center logo and UPI QR for printed invoices.",
  },
  {
    icon: Receipt,
    title: "Invoice defaults",
    description:
      "Invoice prefix, default tax rate, and default payment mode.",
  },
  {
    icon: Lock,
    title: "Security",
    description: "Set a PIN to lock the app when the center is unattended.",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your center profile, branding, and invoice defaults.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
        <Settings className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Settings are coming soon
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            The settings UI is scheduled for the next release. Center profile
            values can be seeded in the database until then.
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
