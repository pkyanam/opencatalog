"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect } from "react";
import type { Source, WorkflowFit } from "@/lib/schema";
import { BasisBadge } from "./basis-badge";

export type ProofContext = {
  altName: string;
  workflowLabel: string;
  status: WorkflowFit["status"];
  note: string | undefined;
  basis: WorkflowFit["basis"];
  sources: Source[];
};

export function ProofDrawer({
  context,
  onClose,
}: {
  context: ProofContext | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!context) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [context, onClose]);

  return (
    <AnimatePresence>
      {context && (
        <>
          <motion.div
            className="proof-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.aside
            className="proof-drawer"
            role="dialog"
            aria-label="Proof and citations"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
          >
            <div className="proof-header">
              <div>
                <h2>Proof &amp; citations</h2>
                <div className="proof-context">
                  {context.altName} · {context.workflowLabel} · {context.status}
                </div>
              </div>
              <button type="button" className="proof-close" onClick={onClose} aria-label="Close proof drawer">
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
            <div className="proof-body">
              {context.note && (
                <div className="proof-section">
                  <h3>note</h3>
                  <p className="prose" style={{ margin: 0, fontSize: 13.5 }}>{context.note}</p>
                </div>
              )}
              <div className="proof-section">
                <h3>evidence basis</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <BasisBadge basis={context.basis} />
                  <span className="sec-note">
                    {context.basis === "probed" && "— verified by direct probe at the source URL"}
                    {context.basis === "cited" && "— sourced from documentation or official statement"}
                    {context.basis === "claimed" && "— asserted without independent verification"}
                  </span>
                </div>
              </div>
              <div className="proof-section">
                <h3>sources ({context.sources.length})</h3>
                {context.sources.length === 0 ? (
                  <p className="sec-note" style={{ margin: 0 }}>No sources recorded for this claim.</p>
                ) : (
                  context.sources.map((src, i) => (
                    <a key={`${src.url}-${i}`} href={src.url} className="proof-source" target="_blank" rel="noopener noreferrer">
                      <span className="src-label">{src.label}</span>
                      <span className="src-url">{src.url}</span>
                      <span className="src-meta">
                        <BasisBadge basis={src.basis} />
                        {src.fetchedAt && (
                          <span className="sec-note">fetched {src.fetchedAt.slice(0, 10)}</span>
                        )}
                      </span>
                    </a>
                  ))
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
