import type { Basis } from "@/lib/schema";

const BASIS_LABELS: Record<Basis, string> = {
  probed: "probed",
  cited: "cited",
  claimed: "claimed",
};

export function BasisBadge({ basis }: { basis: Basis }) {
  return (
    <span className="badge-basis" data-basis={basis} title={`Evidence basis: ${basis}`}>
      {BASIS_LABELS[basis]}
    </span>
  );
}
