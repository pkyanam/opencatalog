import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  type Alternative,
  type ApiEnvelope,
  type Category,
  type LicensePrimitive,
  type PaidProduct,
  SCHEMA_VERSION,
  Alternative as AlternativeSchema,
  ApiEnvelope as ApiEnvelopeSchema,
  Category as CategorySchema,
  LicensePrimitive as LicenseSchema,
  PaidProduct as PaidProductSchema,
  RESERVED_SLUGS,
} from "./schema";

/*
 * Build-time curated-record loader.
 *
 * Reads JSON files from curated/ and assembles the API envelope. Called from
 * static route handlers and generateStaticParams. Never hand-edit raw records;
 * fix the pipeline. Raw records (output/*.json) are post-launch.
 */

const CURATED_DIR = path.join(process.cwd(), "curated");

async function readDir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}

async function readJson<T>(file: string, schema: { parse: (v: unknown) => T }): Promise<T> {
  const raw = await readFile(file, "utf8");
  const json: unknown = JSON.parse(raw);
  return schema.parse(json);
}

async function loadRecords<T>(
  subdir: string,
  schema: { parse: (v: unknown) => T },
): Promise<T[]> {
  const dir = path.join(CURATED_DIR, subdir);
  const files = (await readDir(dir)).filter((f) => f.endsWith(".json"));
  const records = await Promise.all(
    files.map((f) => readJson(path.join(dir, f), schema)),
  );
  return records;
}

export async function loadPaidProducts(): Promise<PaidProduct[]> {
  return loadRecords("paid", PaidProductSchema);
}

export async function loadAlternatives(): Promise<Alternative[]> {
  return loadRecords("alternatives", AlternativeSchema);
}

export async function loadCategories(): Promise<Category[]> {
  return loadRecords("categories", CategorySchema);
}

export async function loadLicenses(): Promise<LicensePrimitive[]> {
  return loadRecords("licenses", LicenseSchema);
}

export async function buildApiEnvelope(): Promise<ApiEnvelope> {
  const [paidProducts, alternatives, categories, licenses] = await Promise.all([
    loadPaidProducts(),
    loadAlternatives(),
    loadCategories(),
    loadLicenses(),
  ]);

  const envelope = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    paidProducts,
    alternatives,
    categories,
    licenses,
  };

  return ApiEnvelopeSchema.parse(envelope);
}

/* ─── Lookups for page rendering ─────────────────────────────────────────── */

export async function getPaidProduct(slug: string): Promise<PaidProduct | null> {
  const all = await loadPaidProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getAlternative(slug: string): Promise<Alternative | null> {
  const all = await loadAlternatives();
  return all.find((a) => a.slug === slug) ?? null;
}

export async function getCategory(slug: string): Promise<Category | null> {
  const all = await loadCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getLicense(slug: string): Promise<LicensePrimitive | null> {
  const all = await loadLicenses();
  return all.find((l) => l.slug === slug) ?? null;
}

export async function getAllPaidProductSlugs(): Promise<string[]> {
  const all = await loadPaidProducts();
  return all.map((p) => p.slug);
}

export async function getAllAlternativeSlugs(): Promise<string[]> {
  const all = await loadAlternatives();
  return all.map((a) => a.slug);
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const all = await loadCategories();
  return all.map((c) => c.slug);
}

export async function getAllLicenseSlugs(): Promise<string[]> {
  const all = await loadLicenses();
  return all.map((l) => l.slug);
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug);
}
