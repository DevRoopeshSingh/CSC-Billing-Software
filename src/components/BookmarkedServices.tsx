// src/renderer/components/BookmarkedServices.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Star,
  Building2,
  Landmark,
  GraduationCap,
  HeartPulse,
  Calculator,
  Car,
  Zap,
  Plane,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { IPC } from "@/shared/ipc-channels";

interface BookmarkedService {
  id: number;
  name: string;
  category: string;
  defaultPrice: number;
  taxRate: number;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Govt Services": Building2,
  "Banking & Payments": Landmark,
  Education: GraduationCap,
  Healthcare: HeartPulse,
  "Financial Services": Calculator,
  "Auto & Insurance": Car,
  "Utility Bills": Zap,
  Travel: Plane,
  Miscellaneous: FileText,
  Other: FileText,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Govt Services": "bg-blue-50 text-blue-600 border-blue-200",
  "Banking & Payments": "bg-emerald-50 text-emerald-600 border-emerald-200",
  Education: "bg-violet-50 text-violet-600 border-violet-200",
  Healthcare: "bg-rose-50 text-rose-600 border-rose-200",
  "Financial Services": "bg-amber-50 text-amber-600 border-amber-200",
  "Auto & Insurance": "bg-cyan-50 text-cyan-600 border-cyan-200",
  "Utility Bills": "bg-yellow-50 text-yellow-600 border-yellow-200",
  Travel: "bg-indigo-50 text-indigo-600 border-indigo-200",
  Miscellaneous: "bg-gray-50 text-gray-600 border-gray-200",
  Other: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function BookmarkedServices({
  onSelect,
}: {
  onSelect?: (serviceId: number) => void;
}) {
  const router = useRouter();
  const [services, setServices] = useState<BookmarkedService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.ipc) {
      setLoading(false);
      return;
    }
    window.ipc
      .invoke(IPC.SERVICES_GET_BOOKMARKED)
      .then((data) =>
        setServices(Array.isArray(data) ? (data as BookmarkedService[]) : [])
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || services.length === 0) return null;

  const handleClick = (svc: BookmarkedService) => {
    if (onSelect) {
      onSelect(svc.id);
    } else {
      router.push(`/billing/new?serviceId=${svc.id}`);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Services
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {services.map((svc) => {
          const Icon = CATEGORY_ICONS[svc.category] ?? FileText;
          const colorCls =
            CATEGORY_COLORS[svc.category] ?? CATEGORY_COLORS["Other"];

          return (
            <button
              key={svc.id}
              onClick={() => handleClick(svc)}
              className={cn(
                "group flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                "border-border bg-card hover:border-primary/40 hover:shadow-md",
                "active:scale-[0.98]"
              )}
            >
              <div className={cn("rounded-lg border p-2.5", colorCls)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="w-full">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {svc.name}
                </p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    ₹{svc.defaultPrice}
                  </span>
                  {svc.taxRate > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      +{svc.taxRate}% GST
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
