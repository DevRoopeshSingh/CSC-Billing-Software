// src/server/handlers/import-csv.ts
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import { parseCsv } from "@/lib/csv";
import { SERVICE_CATEGORIES } from "@/config/categories";
import type { ServicesImportResult, Service } from "@/shared/types";

// Schema for a single row after CSV parsing and validation
interface ServicesImportSeedRow {
  name: string;
  category: string;
  subcategory: string;
  defaultPrice: number;
  taxRate: number;
  priceIsStartingFrom: boolean;
  sortOrder: number;
  keywords: string;
  notes: string;
  isActive: boolean;
  isBookmarked: boolean;
}

// Full service type from DB
type DbService = typeof schema.services.$inferSelect;

function mapDbService(dbSvc: DbService): Service {
  return {
    ...dbSvc,
    defaultPrice: Number(dbSvc.defaultPrice),
    taxRate: Number(dbSvc.taxRate),
    category: dbSvc.category as any,
  };
}

export const servicesImportSchema = z.object({
  csv: z.string(),
  mode: z.enum(["preview", "commit"]),
});

const VALID_CATEGORIES: ReadonlySet<string> = new Set(SERVICE_CATEGORIES);

function coerceBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "") return fallback;
  if (["1", "true", "yes", "y", "t"].includes(v)) return true;
  if (["0", "false", "no", "n", "f"].includes(v)) return false;
  return fallback;
}

function coerceNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const v = raw.trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface SeedNormalizeResult {
  rows: ServicesImportSeedRow[];
  skipped: { row: number; reason: string }[];
}

function normalizeSeedRows(csvRows: Record<string, string>[]): SeedNormalizeResult {
  const rows: ServicesImportSeedRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  csvRows.forEach((raw, idx) => {
    const lineNo = idx + 2;
    const name = (raw.name ?? "").trim();
    const category = (raw.category ?? "").trim();
    if (!name) {
      skipped.push({ row: lineNo, reason: "name is required" });
      return;
    }
    if (!VALID_CATEGORIES.has(category)) {
      skipped.push({ row: lineNo, reason: `category "${category}" is not in the locked taxonomy` });
      return;
    }
    const price = coerceNumber(raw.default_price);
    if (price === null || price < 0) {
      skipped.push({ row: lineNo, reason: "default_price must be a non-negative number" });
      return;
    }
    const taxRate = coerceNumber(raw.tax_rate);
    rows.push({
      name,
      category,
      subcategory: (raw.subcategory ?? "").trim(),
      defaultPrice: price,
      taxRate: taxRate === null ? 0 : Math.max(0, Math.min(100, taxRate)),
      priceIsStartingFrom: coerceBool(raw.price_is_starting_from, false),
      sortOrder: Math.max(0, Math.trunc(coerceNumber(raw.sort_order) ?? 0)),
      keywords: (raw.keywords ?? "").trim(),
      notes: (raw.notes ?? "").trim(),
      isActive: coerceBool(raw.is_active, true),
      isBookmarked: coerceBool(raw.is_bookmarked, false),
    });
  });

  return { rows, skipped };
}

function seedRowsEqual(a: DbService, b: ServicesImportSeedRow): boolean {
  return (
    a.name === b.name &&
    a.category === b.category &&
    (a.subcategory ?? "") === b.subcategory &&
    Number(a.defaultPrice) === b.defaultPrice &&
    Number(a.taxRate) === b.taxRate &&
    Boolean(a.priceIsStartingFrom) === b.priceIsStartingFrom &&
    Number(a.sortOrder ?? 0) === b.sortOrder &&
    (a.keywords ?? "") === b.keywords &&
    (a.notes ?? "") === b.notes
  );
}

class RollbackPreview extends Error {
  constructor(public result: any) {
    super("Rollback Preview");
  }
}

async function applyServiceSeed(
  rows: ServicesImportSeedRow[],
  tx: any
): Promise<{
  added: ServicesImportSeedRow[];
  updated: { before: Service; after: ServicesImportSeedRow }[];
  unchanged: number;
}> {
  const existing = (await tx.select().from(schema.services)) as DbService[];

  const byKey = new Map<string, DbService>();
  for (const svc of existing) {
    byKey.set(`${svc.name.toLowerCase()}|${svc.category}`, svc);
  }

  const added: ServicesImportSeedRow[] = [];
  const updated: { before: Service; after: ServicesImportSeedRow }[] = [];
  let unchanged = 0;

  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${row.category}`;
    const match = byKey.get(key);
    
    if (!match) {
      await tx.insert(schema.services).values({
        name: row.name,
        category: row.category,
        subcategory: row.subcategory,
        defaultPrice: row.defaultPrice,
        taxRate: row.taxRate,
        priceIsStartingFrom: row.priceIsStartingFrom,
        sortOrder: row.sortOrder,
        notes: row.notes,
        isActive: row.isActive,
        isBookmarked: row.isBookmarked,
        keywords: row.keywords,
        createdBy: 1, // System fallback
        updatedBy: 1, // System fallback
      });
      added.push(row);
      continue;
    }
    
    if (seedRowsEqual(match, row)) {
      unchanged++;
      continue;
    }
    
    await tx.update(schema.services).set({
      subcategory: row.subcategory,
      defaultPrice: row.defaultPrice,
      taxRate: row.taxRate,
      priceIsStartingFrom: row.priceIsStartingFrom,
      sortOrder: row.sortOrder,
      notes: row.notes,
      keywords: row.keywords,
      updatedBy: 1, // System fallback
    }).where(eq(schema.services.id, match.id));
    
    updated.push({ before: mapDbService(match), after: row });
  }

  return { added, updated, unchanged };
}

export async function importCsv(data: z.infer<typeof servicesImportSchema>): Promise<ServicesImportResult> {
  const parsed = parseCsv(data.csv);
  const { rows, skipped } = normalizeSeedRows(parsed.rows);
  const parseSkipped = parsed.errors.map((e) => ({
    row: e.line,
    reason: e.message,
  }));

  const db = getDb();

  if (data.mode === "preview") {
    try {
      await db.transaction(async (tx) => {
        const preview = await applyServiceSeed(rows, tx);
        throw new RollbackPreview(preview);
      });
    } catch (e) {
      if (e instanceof RollbackPreview) {
        const preview = e.result;
        return {
          added: preview.added,
          updated: preview.updated,
          unchanged: preview.unchanged,
          skipped: [...skipped, ...parseSkipped],
          totals: {
            rowsRead: parsed.rows.length,
            willAdd: preview.added.length,
            willUpdate: preview.updated.length,
          },
          committed: false,
        };
      }
      throw e;
    }
  }

  // commit mode
  const applied = await db.transaction(async (tx) => {
    // Postgres specific backup table logic is omitted here to keep it simple, 
    // or we could use SELECT INTO. We just run applyServiceSeed.
    return applyServiceSeed(rows, tx);
  });

  return {
    added: applied.added,
    updated: applied.updated,
    unchanged: applied.unchanged,
    skipped: [...skipped, ...parseSkipped],
    totals: {
      rowsRead: parsed.rows.length,
      willAdd: applied.added.length,
      willUpdate: applied.updated.length,
    },
    committed: true,
  };
}

function resolveSeedCsvPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "resources", "seeds", "services-seed.csv"),
    path.join(process.cwd(), "..", "resources", "seeds", "services-seed.csv"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function loadSeedCatalogue(mode: "preview" | "commit"): Promise<ServicesImportResult> {
  const seedPath = resolveSeedCsvPath();
  if (!seedPath) {
    throw new Error("Bundled seed catalogue not found. Reinstall or import a CSV manually.");
  }
  const text = fs.readFileSync(seedPath, "utf8");
  return importCsv({ csv: text, mode });
}
