"use client";

import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES } from "@/config/categories";
import { Bookmark, EyeOff, LayoutList } from "lucide-react";

export type SidebarFilter =
  | { kind: "All" }
  | { kind: "Bookmarked" }
  | { kind: "Inactive" }
  | { kind: "Category"; value: string };

interface Props {
  filter: SidebarFilter;
  onChange: (next: SidebarFilter) => void;
  totalActive: number;
  totalInactive: number;
  totalBookmarked: number;
  countsByCategory: Record<string, number>;
}

export function CategorySidebar({
  filter,
  onChange,
  totalActive,
  totalInactive,
  totalBookmarked,
  countsByCategory,
}: Props) {
  const isCategory = (cat: string) =>
    filter.kind === "Category" && filter.value === cat;

  return (
    <aside className="w-56 flex-none space-y-1">
      <Pseudo
        active={filter.kind === "All"}
        onClick={() => onChange({ kind: "All" })}
        icon={<LayoutList className="h-3.5 w-3.5" />}
        label="All"
        count={totalActive}
      />
      <Pseudo
        active={filter.kind === "Bookmarked"}
        onClick={() => onChange({ kind: "Bookmarked" })}
        icon={<Bookmark className="h-3.5 w-3.5" />}
        label="Bookmarked"
        count={totalBookmarked}
      />
      <Pseudo
        active={filter.kind === "Inactive"}
        onClick={() => onChange({ kind: "Inactive" })}
        icon={<EyeOff className="h-3.5 w-3.5" />}
        label="Inactive"
        count={totalInactive}
      />

      <div className="!mt-4 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Categories
      </div>
      {SERVICE_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange({ kind: "Category", value: cat })}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm",
            isCategory(cat)
              ? "bg-primary/10 font-semibold text-primary"
              : "text-foreground hover:bg-background"
          )}
        >
          <span className="truncate">{cat}</span>
          <span className="text-xs text-muted-foreground">
            {countsByCategory[cat] ?? 0}
          </span>
        </button>
      ))}
    </aside>
  );
}

function Pseudo({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "text-foreground hover:bg-background"
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  );
}
