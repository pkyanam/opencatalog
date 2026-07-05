"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type CompareItem = {
  slug: string;
  name: string;
  href: string;
};

const STORAGE_KEY = "opencatalog:compare";

export function CompareTray() {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [open, setOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CompareItem[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setOpen(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen for add-to-compare events from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CompareItem>).detail;
      if (!detail) return;
      setItems((prev) => {
        if (prev.some((p) => p.slug === detail.slug)) return prev;
        const next = [...prev, detail].slice(0, 4);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      setOpen(true);
    };
    window.addEventListener("opencatalog:compare-add", handler);
    return () => window.removeEventListener("opencatalog:compare-add", handler);
  }, []);

  const removeItem = (slug: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.slug !== slug);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (next.length === 0) setOpen(false);
      return next;
    });
  };

  const clearAll = () => {
    setItems([]);
    setOpen(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {open && items.length > 0 && (
        <motion.div
          className="compare-tray"
          data-open="true"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
        >
          <div className="compare-tray-inner">
            <span className="tray-label">compare ({items.length})</span>
            <div className="tray-items">
              {items.map((item) => (
                <span key={item.slug} className="tray-chip">
                  <a href={item.href}>{item.name}</a>
                  <button type="button" onClick={() => removeItem(item.slug)} aria-label={`Remove ${item.name}`}>
                    <X size={12} strokeWidth={1.5} />
                  </button>
                </span>
              ))}
            </div>
            <button type="button" className="tray-clear" onClick={clearAll}>
              clear
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper for other components to add items
export function addToCompare(item: CompareItem): void {
  window.dispatchEvent(new CustomEvent("opencatalog:compare-add", { detail: item }));
}
