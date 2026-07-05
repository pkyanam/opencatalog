import { describe, expect, it } from "bun:test";
import {
  Alternative as AlternativeSchema,
  ApiEnvelope as ApiEnvelopeSchema,
  Category as CategorySchema,
  LicensePrimitive as LicenseSchema,
  PaidProduct as PaidProductSchema,
  SCHEMA_VERSION,
} from "../src/lib/schema";
import { buildApiEnvelope } from "../src/lib/data";

describe("schema version", () => {
  it("exports a semver string", () => {
    expect(typeof SCHEMA_VERSION).toBe("string");
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("curated records parse against schemas", () => {
  it("all paid products parse", async () => {
    const envelope = await buildApiEnvelope();
    for (const p of envelope.paidProducts) {
      const result = PaidProductSchema.safeParse(p);
      expect(result.success).toBe(true);
    }
  });

  it("all alternatives parse", async () => {
    const envelope = await buildApiEnvelope();
    for (const a of envelope.alternatives) {
      const result = AlternativeSchema.safeParse(a);
      expect(result.success).toBe(true);
    }
  });

  it("all categories parse", async () => {
    const envelope = await buildApiEnvelope();
    for (const c of envelope.categories) {
      const result = CategorySchema.safeParse(c);
      expect(result.success).toBe(true);
    }
  });

  it("all licenses parse", async () => {
    const envelope = await buildApiEnvelope();
    for (const l of envelope.licenses) {
      const result = LicenseSchema.safeParse(l);
      expect(result.success).toBe(true);
    }
  });
});

describe("API envelope integrity", () => {
  it("envelope parses against ApiEnvelope schema", async () => {
    const envelope = await buildApiEnvelope();
    const result = ApiEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });

  it("envelope has correct schemaVersion", async () => {
    const envelope = await buildApiEnvelope();
    expect(envelope.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("envelope has generatedAt as valid ISO date", async () => {
    const envelope = await buildApiEnvelope();
    const d = new Date(envelope.generatedAt);
    expect(d.getTime()).not.toBeNaN();
  });

  it("every paid product has at least one ranked alternative", async () => {
    const envelope = await buildApiEnvelope();
    for (const p of envelope.paidProducts) {
      expect(p.rankedAlternatives.length).toBeGreaterThan(0);
    }
  });

  it("every alternative has at least one install path", async () => {
    const envelope = await buildApiEnvelope();
    for (const a of envelope.alternatives) {
      expect(a.installPaths.length).toBeGreaterThan(0);
    }
  });

  it("every alternative has an OSI-approved license", async () => {
    const envelope = await buildApiEnvelope();
    for (const a of envelope.alternatives) {
      expect(a.license.osiApproved).toBe(true);
    }
  });

  it("every ranked alternative resolves to an existing alternative", async () => {
    const envelope = await buildApiEnvelope();
    const altSlugs = new Set(envelope.alternatives.map((a) => a.slug));
    for (const p of envelope.paidProducts) {
      for (const ra of p.rankedAlternatives) {
        expect(altSlugs.has(ra.altSlug)).toBe(true);
      }
    }
  });

  it("every alternative.replaces resolves to an existing paid product", async () => {
    const envelope = await buildApiEnvelope();
    const paidSlugs = new Set(envelope.paidProducts.map((p) => p.slug));
    for (const a of envelope.alternatives) {
      for (const r of a.replaces) {
        expect(paidSlugs.has(r)).toBe(true);
      }
    }
  });
});

describe("verified record grounding", () => {
  it("verified alternatives have probed or cited license basis", async () => {
    const envelope = await buildApiEnvelope();
    for (const a of envelope.alternatives) {
      if (!a.verified) continue;
      expect(a.license.basis).not.toBe("claimed");
    }
  });

  it("verified alternatives have at least one grounded install path", async () => {
    const envelope = await buildApiEnvelope();
    for (const a of envelope.alternatives) {
      if (!a.verified) continue;
      const grounded = a.installPaths.some(
        (ip) => ip.basis === "probed" || ip.basis === "cited",
      );
      expect(grounded).toBe(true);
    }
  });
});
