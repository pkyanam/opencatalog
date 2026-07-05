"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { Alternative, PaidProduct, WorkflowFit } from "@/lib/schema";
import { addToCompare, CompareTray, type CompareItem } from "./compare-tray";
import { ProofDrawer, type ProofContext } from "./proof-drawer";

const STATUS_GLYPH: Record<WorkflowFit["status"], string> = {
  supported: "✓",
  partial: "≈",
  missing: "✗",
  unknown: "?",
};

export function PaidProductInteractions({
  paid,
  alternatives,
}: {
  paid: PaidProduct;
  alternatives: Alternative[];
}) {
  const [proof, setProof] = useState<ProofContext | null>(null);

  const altBySlug = (slug: string) => alternatives.find((a) => a.slug === slug);

  const handleCellClick = (
    altName: string,
    workflowLabel: string,
    wf: WorkflowFit,
  ) => {
    setProof({
      altName,
      workflowLabel,
      status: wf.status,
      note: wf.note,
      basis: wf.basis,
      sources: wf.sources,
    });
  };

  const handleAddToCompare = (alt: Alternative) => {
    const item: CompareItem = {
      slug: alt.slug,
      name: alt.name,
      href: `/alt/${alt.slug}/`,
    };
    addToCompare(item);
  };

  return (
    <>
      {/* Switch map */}
      <section className="switch-map">
        <div className="sec-header">
          <span className="sec-label">switch map</span>
          <span className="sec-note">workflow × alternative · click any cell for proof</span>
        </div>
        <table className="switch-map-table">
          <thead>
            <tr>
              <th scope="col">workflow</th>
              {paid.rankedAlternatives.map((ra) => {
                const alt = altBySlug(ra.altSlug);
                return (
                  <th key={ra.altSlug} scope="col">
                    <a href={`/alt/${ra.altSlug}/`} className="alt-link">
                      {alt?.name ?? ra.altSlug}
                    </a>
                    <span className="alt-fit" data-fit={ra.fit}>{ra.fit}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paid.workflows.map((wf) => (
              <tr key={wf.slug}>
                <th scope="row">{wf.label}</th>
                {paid.rankedAlternatives.map((ra) => {
                  const fit = ra.workflowFit.find((f) => f.workflowSlug === wf.slug);
                  if (!fit) {
                    return (
                      <td key={ra.altSlug}>
                        <span className="wf-status" data-status="unknown">
                          <span className="glyph">{STATUS_GLYPH.unknown}</span>unknown
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td
                      key={ra.altSlug}
                      className="cell-proof"
                      onClick={() =>
                        handleCellClick(
                          altBySlug(ra.altSlug)?.name ?? ra.altSlug,
                          wf.label,
                          fit,
                        )
                      }
                    >
                      <span className="wf-status" data-status={fit.status}>
                        <span className="glyph">{STATUS_GLYPH[fit.status]}</span>
                        {fit.status}
                      </span>
                      {fit.note && <span className="wf-note">{fit.note}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Ranked board */}
      <section className="ranked-board">
        <div className="sec-header">
          <span className="sec-label">ranked alternatives</span>
          <span className="sec-note">{paid.rankedAlternatives.length} tools · grounded</span>
        </div>
        <div className="ranked-list">
          {paid.rankedAlternatives.map((ra) => {
            const alt = altBySlug(ra.altSlug);
            if (!alt) return null;
            return (
              <article key={ra.altSlug} className="ranked-item">
                <div>
                  <a href={`/alt/${ra.altSlug}/`} className="ranked-name">{alt.name}</a>
                  {alt.tagline && (
                    <p className="ranked-note" style={{ color: "var(--ink-faint)", fontSize: 13, margin: "4px 0 0" }}>
                      {alt.tagline}
                    </p>
                  )}
                  <p className="ranked-note">{ra.note}</p>
                  <div className="ranked-chips">
                    <span className="chip">{alt.license.name}</span>
                    {alt.deployment.map((d) => (
                      <span key={d} className="chip">{d}</span>
                    ))}
                    {alt.knownGaps.length > 0 && (
                      <span className="chip chip-warn">{alt.knownGaps.length} known gap{alt.knownGaps.length === 1 ? "" : "s"}</span>
                    )}
                  </div>
                </div>
                <div className="ranked-side">
                  <span className="ranked-fit" data-fit={ra.fit}>{ra.fit}</span>
                  <span className="ranked-deploy">
                    {alt.maturity.find((m) => m.kind === "repo-stars")?.value ?? "—"} stars
                  </span>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => handleAddToCompare(alt)}
                    style={{ cursor: "pointer" }}
                  >
                    <Plus size={11} strokeWidth={1.5} /> compare
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <ProofDrawer context={proof} onClose={() => setProof(null)} />
      <CompareTray />
    </>
  );
}
