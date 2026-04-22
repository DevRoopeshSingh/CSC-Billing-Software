// src/app/settings/backup/page.tsx
"use client";

import { cn } from "@/lib/utils";
import { HardDrive, Download, Upload, Clock } from "lucide-react";

const UPCOMING = [
  {
    icon: Download,
    title: "Export backup",
    description:
      "Save a full snapshot of your database to a location of your choice.",
  },
  {
    icon: Upload,
    title: "Import backup",
    description:
      "Restore from a previously exported snapshot. Useful when moving to a new machine.",
  },
  {
    icon: Clock,
    title: "Automatic backups",
    description:
      "Daily auto-backups are already written to your Documents folder. UI to browse and restore them is coming next.",
  },
];

export default function BackupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Backup &amp; Restore</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Protect your data with automatic and on-demand backups.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
        <HardDrive className="h-10 w-10 text-muted-foreground/40" />
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Backup UI is coming soon
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Automatic daily backups are running in the background. The UI to
            export, import, and browse backups is scheduled for the next
            release.
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
