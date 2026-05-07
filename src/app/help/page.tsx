// src/app/help/page.tsx
// Operator-facing Service FAQ. Available to every authed role — staff is the
// primary user (they read this aloud to walk-in customers); admins and
// viewers see the same content. No mutations, no IPC — content is bundled.

"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Search,
  X,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FAQ_CATEGORIES,
  FAQ_INDEX,
  FAQ_TOTAL_ENTRIES,
  type FaqCategory,
  type FaqEntry,
} from "@/data/faq";

// Result of applying the current search query: each category keeps only the
// entries that matched, and categories with zero matches are dropped.
interface FilteredCategory {
  category: FaqCategory;
  entries: FaqEntry[];
}

function filterCategories(query: string): FilteredCategory[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return FAQ_CATEGORIES.map((c) => ({ category: c, entries: c.entries }));
  }
  const matches = FAQ_INDEX.filter((e) => e.haystack.includes(q));
  // Group preserving the source category order.
  const byCategory = new Map<string, FaqEntry[]>();
  for (const m of matches) {
    const list = byCategory.get(m.category.id) ?? [];
    list.push(m);
    byCategory.set(m.category.id, list);
  }
  return FAQ_CATEGORIES.flatMap((c) => {
    const entries = byCategory.get(c.id);
    return entries && entries.length > 0
      ? [{ category: c, entries }]
      : [];
  });
}

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterCategories(query), [query]);
  const matchCount = useMemo(
    () => filtered.reduce((s, c) => s + c.entries.length, 0),
    [filtered]
  );
  const isFiltering = query.trim().length > 0;

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Service FAQ</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Quick reference for the questions customers ask at the desk.
            Searchable, grouped by service category.
          </p>
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
          {FAQ_TOTAL_ENTRIES} questions · {FAQ_CATEGORIES.length} categories
        </span>
      </div>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions, answers, rates…"
          className={cn(
            "w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            "placeholder:text-muted-foreground"
          )}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Category jump-rail (only when not filtering) ─────────────── */}
      {!isFiltering && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FAQ_CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.id}
                href={`#cat-${c.id}`}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5",
                  "text-[12px] font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {c.name}
                <span className="text-[10px] text-muted-foreground/70">
                  {c.entries.length}
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* ── Filter result summary ────────────────────────────────────── */}
      {isFiltering && (
        <p className="text-xs text-muted-foreground">
          {matchCount === 0
            ? `No matches for "${query.trim()}".`
            : `${matchCount} match${matchCount === 1 ? "" : "es"} for "${query.trim()}".`}
        </p>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-muted-foreground">
          <HelpCircle className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm">Try a shorter or simpler search term.</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Reset search
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map(({ category, entries }) => {
            const Icon = category.icon;
            return (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                className="scroll-mt-24 rounded-xl border border-border bg-card shadow-sm"
              >
                <header className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground">
                      {category.name}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <span className="ml-auto rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {entries.length}
                  </span>
                </header>

                <div className="divide-y divide-border">
                  {entries.map((entry) => (
                    <FaqItem
                      key={entry.id}
                      entry={entry}
                      // When the user is searching, expand by default so they
                      // see the matching answer without an extra click.
                      defaultOpen={isFiltering}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Single Q&A row. Native <details> handles a11y + keyboard expansion.
// `key={…|defaultOpen}` is the trick to let parents force a re-mount when
// the search state flips, so the open-state respects the new default.
function FaqItem({
  entry,
  defaultOpen,
}: {
  entry: FaqEntry;
  defaultOpen: boolean;
}) {
  return (
    <details
      key={`${entry.id}-${defaultOpen ? "1" : "0"}`}
      id={entry.id}
      open={defaultOpen}
      className="group scroll-mt-24"
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-start gap-3 px-5 py-4",
          "transition-colors hover:bg-background",
          "focus:outline-none focus-visible:bg-background"
        )}
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            "-rotate-90 group-open:rotate-0"
          )}
        />
        <span className="text-sm font-semibold text-foreground">{entry.q}</span>
      </summary>
      <div className="space-y-3 px-5 pb-5 pl-12 text-sm text-foreground">
        <p className="leading-relaxed text-muted-foreground">{entry.a}</p>
        {entry.bullets && entry.bullets.length > 0 && (
          <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground marker:text-muted-foreground/60">
            {entry.bullets.map((b, i) => (
              <li key={i} className="leading-relaxed">
                {b}
              </li>
            ))}
          </ul>
        )}
        {entry.aTail && (
          <p className="leading-relaxed text-muted-foreground">{entry.aTail}</p>
        )}
      </div>
    </details>
  );
}
