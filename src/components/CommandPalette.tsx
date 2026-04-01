"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCommandPalette } from "./CommandPaletteProvider";
import { formatCurrency } from "@/lib/formatters";

interface SearchResult {
  id: number;
  _type: "customer" | "invoice" | "service" | "faq";
  name?: string;
  mobile?: string;
  tags?: string;
  invoiceNo?: string;
  total?: number;
  status?: string;
  customerName?: string;
  category?: string;
  defaultPrice?: number;
  question?: string;
}

interface SearchResults {
  customers?: SearchResult[];
  invoices?: SearchResult[];
  services?: SearchResult[];
  faq?: SearchResult[];
}

const STATIC_COMMANDS = [
  { id: "cmd-new-bill", label: "New Bill", icon: "📝", href: "/billing/new" },
  { id: "cmd-dashboard", label: "Go to Dashboard", icon: "📊", href: "/" },
  { id: "cmd-invoices", label: "View Invoices", icon: "📄", href: "/invoices" },
  { id: "cmd-reports", label: "View Reports", icon: "📈", href: "/reports" },
  { id: "cmd-customers", label: "View Customers", icon: "👥", href: "/customers" },
  { id: "cmd-services", label: "Manage Services", icon: "🔧", href: "/services" },
  { id: "cmd-leads", label: "View Leads", icon: "🎯", href: "/leads" },
  { id: "cmd-faq", label: "Manage FAQ", icon: "❓", href: "/faq" },
  { id: "cmd-settings", label: "Settings", icon: "⚙️", href: "/settings" },
];

export default function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults({});
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({});
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/unified?q=${encodeURIComponent(query.trim())}&limit=4`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.data || {});
        }
      } catch { /* ignore */ }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Build flat list of all results for keyboard nav
  const allItems = useCallback(() => {
    const items: { type: string; item: any; href: string }[] = [];

    (results.customers || []).forEach((c) =>
      items.push({ type: "customer", item: c, href: `/customers/${c.id}` })
    );
    (results.invoices || []).forEach((inv) =>
      items.push({ type: "invoice", item: inv, href: `/invoice/${inv.id}` })
    );
    (results.services || []).forEach((s) =>
      items.push({ type: "service", item: s, href: `/services` })
    );
    (results.faq || []).forEach((f) =>
      items.push({ type: "faq", item: f, href: `/faq` })
    );

    // Add filtered static commands
    const q = query.toLowerCase();
    STATIC_COMMANDS.filter(
      (cmd) => !q || cmd.label.toLowerCase().includes(q)
    ).forEach((cmd) =>
      items.push({ type: "command", item: cmd, href: cmd.href })
    );

    return items;
  }, [results, query]);

  const flatItems = allItems();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatItems[selectedIndex]) {
      e.preventDefault();
      router.push(flatItems[selectedIndex].href);
      close();
    } else if (e.key === "Escape") {
      close();
    }
  };

  const handleSelect = (href: string) => {
    router.push(href);
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-backdrop" onClick={close}>
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="cmd-palette-input-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="cmd-palette-search-icon">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search customers, invoices, services, or type a command…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="cmd-palette-input"
          />
          <kbd className="cmd-palette-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="cmd-palette-results">
          {loading && (
            <div className="cmd-palette-empty">Searching…</div>
          )}

          {!loading && query && flatItems.length === 0 && (
            <div className="cmd-palette-empty">No results for &ldquo;{query}&rdquo;</div>
          )}

          {/* Customers */}
          {(results.customers || []).length > 0 && (
            <div className="cmd-palette-group">
              <div className="cmd-palette-group-label">Customers</div>
              {results.customers!.map((c, i) => {
                const idx = i;
                return (
                  <button
                    key={`c-${c.id}`}
                    className={`cmd-palette-item${selectedIndex === idx ? " active" : ""}`}
                    onClick={() => handleSelect(`/customers/${c.id}`)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="cmd-palette-item-icon">👤</span>
                    <span className="cmd-palette-item-label">{c.name}</span>
                    <span className="cmd-palette-item-meta">{c.mobile}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Invoices */}
          {(results.invoices || []).length > 0 && (
            <div className="cmd-palette-group">
              <div className="cmd-palette-group-label">Invoices</div>
              {results.invoices!.map((inv) => {
                const idx = (results.customers?.length || 0) + results.invoices!.indexOf(inv);
                return (
                  <button
                    key={`inv-${inv.id}`}
                    className={`cmd-palette-item${selectedIndex === idx ? " active" : ""}`}
                    onClick={() => handleSelect(`/invoice/${inv.id}`)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="cmd-palette-item-icon">📄</span>
                    <span className="cmd-palette-item-label">{inv.invoiceNo}</span>
                    <span className="cmd-palette-item-meta">
                      {inv.customerName} · {formatCurrency(inv.total || 0)}
                      <span className={`badge badge-sm ${inv.status === "PAID" ? "badge-green" : inv.status === "CANCELLED" ? "badge-red" : "badge-yellow"}`}
                        style={{ marginLeft: 8, fontSize: 10 }}
                      >
                        {inv.status}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Services */}
          {(results.services || []).length > 0 && (
            <div className="cmd-palette-group">
              <div className="cmd-palette-group-label">Services</div>
              {results.services!.map((s) => {
                const idx =
                  (results.customers?.length || 0) +
                  (results.invoices?.length || 0) +
                  results.services!.indexOf(s);
                return (
                  <button
                    key={`s-${s.id}`}
                    className={`cmd-palette-item${selectedIndex === idx ? " active" : ""}`}
                    onClick={() => handleSelect(`/services`)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="cmd-palette-item-icon">🔧</span>
                    <span className="cmd-palette-item-label">{s.name}</span>
                    <span className="cmd-palette-item-meta">
                      {s.category} · {formatCurrency(s.defaultPrice || 0)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* FAQ */}
          {(results.faq || []).length > 0 && (
            <div className="cmd-palette-group">
              <div className="cmd-palette-group-label">FAQ</div>
              {results.faq!.map((f) => {
                const idx =
                  (results.customers?.length || 0) +
                  (results.invoices?.length || 0) +
                  (results.services?.length || 0) +
                  results.faq!.indexOf(f);
                return (
                  <button
                    key={`f-${f.id}`}
                    className={`cmd-palette-item${selectedIndex === idx ? " active" : ""}`}
                    onClick={() => handleSelect(`/faq`)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <span className="cmd-palette-item-icon">❓</span>
                    <span className="cmd-palette-item-label">{f.question}</span>
                    <span className="cmd-palette-item-meta">{f.category}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Static Commands */}
          {flatItems.filter((i) => i.type === "command").length > 0 && (
            <div className="cmd-palette-group">
              <div className="cmd-palette-group-label">Commands</div>
              {flatItems
                .filter((i) => i.type === "command")
                .map((cmd) => {
                  const idx = flatItems.indexOf(cmd);
                  return (
                    <button
                      key={cmd.item.id}
                      className={`cmd-palette-item${selectedIndex === idx ? " active" : ""}`}
                      onClick={() => handleSelect(cmd.href)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="cmd-palette-item-icon">{cmd.item.icon}</span>
                      <span className="cmd-palette-item-label">{cmd.item.label}</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cmd-palette-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
