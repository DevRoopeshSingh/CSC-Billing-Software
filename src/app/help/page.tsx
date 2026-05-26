"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { useToast } from "@/components/Toast";
import {
  BookOpen,
  ChevronDown,
  Search,
  X,
  HelpCircle,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FAQ_CATEGORIES,
  FAQ_INDEX,
  FAQ_TOTAL_ENTRIES,
  type FaqCategory,
  type FaqEntry,
} from "@/data/faq";

interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
  isPublished: boolean;
}

// Result of applying the current search query
interface FilteredCategory {
  category: FaqCategory;
  entries: FaqEntry[];
}

function getUnifiedCategories(dynamicFaqs: Faq[]): FaqCategory[] {
  // We want to deep clone FAQ_CATEGORIES to avoid mutating the original static array
  const unified = FAQ_CATEGORIES.map((c) => ({ ...c, entries: [...c.entries] }));

  for (const df of dynamicFaqs) {
    if (!df.isPublished) continue;

    // Convert to FaqEntry format
    const entry: FaqEntry = {
      id: `db-${df.id}`,
      q: df.question,
      a: df.answer,
    };

    const existingCat = unified.find((c) => c.name === df.category);
    if (existingCat) {
      existingCat.entries.push(entry);
    } else {
      unified.push({
        id: `cat-${df.category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: df.category,
        icon: BookOpen,
        description: "Custom Knowledge Base entries.",
        entries: [entry],
      });
    }
  }
  return unified;
}

function filterCategories(query: string, dynamicFaqs: Faq[]): FilteredCategory[] {
  const allCategories = getUnifiedCategories(dynamicFaqs);
  const q = query.trim().toLowerCase();

  if (!q) {
    return allCategories.map((c) => ({ category: c, entries: c.entries }));
  }

  // Create an index of ALL entries for searching
  const allIndex = allCategories.flatMap((cat) =>
    cat.entries.map((e) => ({
      ...e,
      category: cat,
      haystack: [
        cat.name,
        e.q,
        e.a,
        ...(e.bullets ?? []),
        e.aTail ?? "",
        ...(e.tags ?? []),
      ]
        .join(" \n ")
        .toLowerCase(),
    }))
  );

  const matches = allIndex.filter((e) => e.haystack.includes(q));

  // Group preserving the source category order
  const byCategory = new Map<string, FaqEntry[]>();
  for (const m of matches) {
    const catId = m.category.id;
    if (!byCategory.has(catId)) byCategory.set(catId, []);
    byCategory.get(catId)!.push(m);
  }

  const result: FilteredCategory[] = [];
  for (const c of allCategories) {
    if (byCategory.has(c.id)) {
      result.push({ category: c, entries: byCategory.get(c.id)! });
    }
  }
  return result;
}

export default function HelpPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFaq, setNewFaq] = useState({
    question: "",
    answer: "",
    category: "General",
  });

  useEffect(() => {
    // Fetch dynamic FAQs
    if (currentUser) loadFaqs();
  }, [currentUser]);

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const data = await api.get<Faq[]>("/api/faq");
      setFaqs(data);
    } catch (err) {
      toast("Failed to load FAQs", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/api/faq", newFaq);
      toast("FAQ added successfully", "success");
      setShowAddModal(false);
      setNewFaq({ question: "", answer: "", category: "General" });
      loadFaqs();
    } catch (err) {
      toast("Failed to add FAQ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => filterCategories(query, faqs), [query, faqs]);
  const matchCount = useMemo(
    () => filtered.reduce((s, c) => s + c.entries.length, 0),
    [filtered]
  );
  const isFiltering = query.trim().length > 0;

  const totalEntries = FAQ_TOTAL_ENTRIES + faqs.length;
  const totalCategories = getUnifiedCategories(faqs).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Knowledge Base</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Frequently asked questions and service guidelines. Searchable, grouped by service category.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground hidden sm:inline-block">
            {totalEntries} questions · {totalCategories} categories
          </span>
          {currentUser?.role !== "viewer" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              Add FAQ
            </button>
          )}
        </div>
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
          {getUnifiedCategories(faqs).map((c) => {
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
                <span className="whitespace-nowrap">{c.name}</span>
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

      {/* ── Add Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Add Knowledge Base Entry</h3>
            <form onSubmit={handleAddFaq} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Question / Topic</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Category</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newFaq.category}
                  onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                  placeholder="e.g. General, Services, Insurance"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Answer / Content</label>
                <textarea
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Q&A row. Native <details> handles a11y + keyboard expansion.
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
        <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{entry.a}</p>
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
          <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{entry.aTail}</p>
        )}
      </div>
    </details>
  );
}
