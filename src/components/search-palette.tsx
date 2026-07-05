"use client";

import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { create, insertMultiple, search, type Orama } from "@orama/orama";
import type { ApiEnvelope, PaidProduct, Alternative } from "@/lib/schema";

type SearchResult = {
  id: string;
  type: "paid" | "alt" | "category" | "license";
  slug: string;
  name: string;
  subtitle: string;
  href: string;
};

const SCHEMA = {
  id: "string",
  type: "string",
  slug: "string",
  name: "string",
  subtitle: "string",
  href: "string",
} as const;

function buildResults(envelope: ApiEnvelope): SearchResult[] {
  const results: SearchResult[] = [];
  for (const p of envelope.paidProducts) {
    results.push({
      id: `paid:${p.slug}`,
      type: "paid",
      slug: p.slug,
      name: p.name,
      subtitle: p.tagline ?? p.description.slice(0, 80),
      href: `/${p.slug}/`,
    });
  }
  for (const a of envelope.alternatives) {
    results.push({
      id: `alt:${a.slug}`,
      type: "alt",
      slug: a.slug,
      name: a.name,
      subtitle: a.tagline ?? a.description.slice(0, 80),
      href: `/alt/${a.slug}/`,
    });
  }
  for (const c of envelope.categories) {
    results.push({
      id: `cat:${c.slug}`,
      type: "category",
      slug: c.slug,
      name: c.name,
      subtitle: c.definition.slice(0, 80),
      href: `/category/${c.slug}/`,
    });
  }
  for (const l of envelope.licenses) {
    results.push({
      id: `lic:${l.slug}`,
      type: "license",
      slug: l.slug,
      name: l.name,
      subtitle: l.spdxId,
      href: `/license/${l.slug}/`,
    });
  }
  return results;
}

export function SearchPalette({ envelope }: { envelope: ApiEnvelope }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchResult[]>([]);
  const router = useRouter();
  const dbRef = useRef<Orama<typeof SCHEMA> | null>(null);
  const allResults = useMemo(() => buildResults(envelope), [envelope]);

  // Initialize Orama index once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await create({ schema: SCHEMA });
      await insertMultiple(db, allResults as unknown as Record<string, string>[]);
      if (!cancelled) dbRef.current = db;
    })();
    return () => {
      cancelled = true;
    };
  }, [allResults]);

  // Keyboard shortcut: / to open, Escape to close (cmdk handles escape)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !open && !(e.target as HTMLElement)?.matches?.("input,textarea")) {
        e.preventDefault();
        setOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Run search on query change
  useEffect(() => {
    if (!query.trim()) {
      setHits(allResults.slice(0, 8));
      return;
    }
    if (!dbRef.current) {
      // Fallback: client-side filter while index loads
      const q = query.toLowerCase();
      setHits(
        allResults
          .filter(
            (r) =>
              r.name.toLowerCase().includes(q) ||
              r.subtitle.toLowerCase().includes(q) ||
              r.slug.includes(q),
          )
          .slice(0, 12),
      );
      return;
    }
    Promise.resolve(search(dbRef.current, { term: query, limit: 12 }))
      .then((res) => {
        const matched = res.hits
          .map((h) => allResults.find((r) => r.id === (h.document as unknown as SearchResult).id))
          .filter((r): r is SearchResult => r !== undefined);
        setHits(matched.length > 0 ? matched : allResults.slice(0, 8));
      })
      .catch(() => setHits(allResults.slice(0, 8)));
  }, [query, allResults]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  const typeLabel: Record<SearchResult["type"], string> = {
    paid: "paid",
    alt: "foss",
    category: "category",
    license: "license",
  };

  return (
    <>
      <button
        type="button"
        className="search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search opencatalog.sh"
      >
        <Search size={15} strokeWidth={1.5} />
        <span>Search paid products, FOSS tools, categories…</span>
        <kbd className="search-kbd">/</kbd>
      </button>

      {open && (
        <div className="palette-overlay" onClick={() => setOpen(false)}>
          <Command
            className="palette"
            label="Search opencatalog.sh"
            shouldFilter={false}
            value=""
            onValueChange={() => {}}
          >
            <div className="palette-input-row">
              <Search size={16} strokeWidth={1.5} />
              <Command.Input
                placeholder="Type a paid product, FOSS tool, category, or license…"
                value={query}
                onValueChange={setQuery}
                autoFocus
              />
              <kbd className="search-kbd">esc</kbd>
            </div>
            <Command.List className="palette-list">
              <Command.Empty className="palette-empty">
                {query ? `No matches for "${query}"` : "Start typing to search the catalog"}
              </Command.Empty>
              {hits.map((hit) => (
                <Command.Item
                  key={hit.id}
                  value={hit.id}
                  onSelect={() => handleSelect(hit.href)}
                  className="palette-item"
                >
                  <span className={`palette-type palette-type-${hit.type}`}>
                    {typeLabel[hit.type]}
                  </span>
                  <span className="palette-name">{hit.name}</span>
                  <span className="palette-subtitle">{hit.subtitle}</span>
                </Command.Item>
              ))}
            </Command.List>
            <div className="palette-footer">
              <span>
                <kbd className="search-kbd">↑↓</kbd> navigate
              </span>
              <span>
                <kbd className="search-kbd">↵</kbd> open
              </span>
              <span>
                <kbd className="search-kbd">/</kbd> or <kbd className="search-kbd">⌘k</kbd> toggle
              </span>
              <span className="palette-footer-note">
                {allResults.length} entries indexed
              </span>
            </div>
          </Command>
        </div>
      )}
    </>
  );
}

// Re-export for type narrowing in paid-product pages
export type { PaidProduct, Alternative };
