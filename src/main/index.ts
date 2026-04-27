// src/main/index.ts
// Electron main process: DB bootstrap, IPC handlers, window, standalone Next server.

import { app, BrowserWindow, ipcMain, dialog, Notification } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import path from "path";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";
import { autoUpdater } from "electron-updater";
import { eq, desc, and, gte, lte, sql, getTableColumns } from "drizzle-orm";
import { z } from "zod";
import { initDatabase, getDb, getSqlite, closeDatabase } from "../db";
import * as schema from "../db/schema";
import { IPC } from "../shared/ipc-channels";
import {
  customerSchema,
  serviceSchema,
  createInvoiceSchema,
  centerProfileSchema,
  InvoiceStatus,
  servicesImportSchema,
  bulkUpdateServicesSchema,
  bulkDeleteServicesSchema,
  checklistUpsertBulkSchema,
  type ServicesImportSeedRow,
  type ServicesImportResult,
  type Service,
  type BulkDeleteServicesResult,
} from "../shared/types";
import { SERVICE_CATEGORIES } from "../config/categories";
import { parseCsv } from "../lib/csv";
import { scanForPrinters } from "./printerScan";
import { generateInvoicePdf } from "./invoicePdf";
import { printReceipt, printTestPage } from "./printerReceipt";

// ── Paths ────────────────────────────────────────────────────────────────────
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "csc_billing.db");
const uploadsPath = path.join(userDataPath, "uploads");

process.env.DATABASE_URL = `file:${dbPath}`;
process.env.USER_DATA_PATH = userDataPath;

let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;
let digestShownToday = "";

// ── Shared SQL fragments ─────────────────────────────────────────────────────
// Business rule: revenue/aggregation queries must exclude CANCELLED invoices.
// Centralized so the rule is enforced consistently across handlers.
const notCancelled = sql`${schema.invoices.status} != 'CANCELLED'`;

// ── Safe IPC wrapper ─────────────────────────────────────────────────────────
type Handler = (
  event: IpcMainInvokeEvent,
  ...args: unknown[]
) => unknown | Promise<unknown>;

function safeHandle(channel: string, handler: Handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[IPC ${channel}]`, err);
      return { error: message };
    }
  });
}

// Parse the first positional arg with a Zod schema; on failure, throw so
// safeHandle converts it into an { error } response.
function parseArg<T>(schema: z.ZodType<T>, arg: unknown, label: string): T {
  const result = schema.safeParse(arg);
  if (!result.success) {
    throw new Error(
      `[${label}] invalid input: ${result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }
  return result.data;
}

// ── Printer config is now in DB (center_profiles) ────────────────────────────

// ── DB bootstrap ─────────────────────────────────────────────────────────────
// Resolve the bundled services seed CSV. In dev we read from the repo;
// in a packaged app it sits under `process.resourcesPath/seeds/`.
function resolveSeedCsvPath(): string | null {
  const candidates = app.isPackaged
    ? [path.join(process.resourcesPath, "seeds", "services-seed.csv")]
    : [
        path.join(process.cwd(), "resources", "seeds", "services-seed.csv"),
        // dist-electron is one level below the repo root in dev.
        path.join(__dirname, "..", "resources", "seeds", "services-seed.csv"),
        path.join(__dirname, "..", "..", "resources", "seeds", "services-seed.csv"),
      ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

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

function normalizeSeedRows(
  csvRows: Record<string, string>[]
): SeedNormalizeResult {
  const rows: ServicesImportSeedRow[] = [];
  const skipped: { row: number; reason: string }[] = [];

  csvRows.forEach((raw, idx) => {
    // CSV row numbers are 1-based with header on line 1, so data rows start at 2.
    const lineNo = idx + 2;
    const name = (raw.name ?? "").trim();
    const category = (raw.category ?? "").trim();
    if (!name) {
      skipped.push({ row: lineNo, reason: "name is required" });
      return;
    }
    if (!VALID_CATEGORIES.has(category)) {
      skipped.push({
        row: lineNo,
        reason: `category "${category}" is not in the locked taxonomy`,
      });
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

function seedRowsEqual(a: Service, b: ServicesImportSeedRow): boolean {
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

// Apply the seed/import rules. Caller controls the transaction boundary so
// the same logic powers fresh-DB seeding, preview, and commit.
function applyServiceSeed(
  rows: ServicesImportSeedRow[]
): {
  added: ServicesImportSeedRow[];
  updated: { before: Service; after: ServicesImportSeedRow }[];
  unchanged: number;
} {
  const sqlite = getSqlite();
  const existing = sqlite
    .prepare(
      `SELECT id, name, category, subcategory, default_price as defaultPrice,
              tax_rate as taxRate, price_is_starting_from as priceIsStartingFrom,
              sort_order as sortOrder, notes, is_active as isActive,
              is_bookmarked as isBookmarked, keywords FROM services`
    )
    .all() as Service[];

  const byKey = new Map<string, Service>();
  for (const svc of existing) {
    byKey.set(`${svc.name.toLowerCase()}|${svc.category}`, svc);
  }

  const insert = sqlite.prepare(
    `INSERT INTO services
      (name, category, subcategory, default_price, tax_rate,
       price_is_starting_from, sort_order, notes, is_active,
       is_bookmarked, keywords)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  // Update rule: never overwrite operator-managed is_active / is_bookmarked.
  const update = sqlite.prepare(
    `UPDATE services
       SET subcategory = ?, default_price = ?, tax_rate = ?,
           price_is_starting_from = ?, sort_order = ?, notes = ?,
           keywords = ?
     WHERE id = ?`
  );

  const added: ServicesImportSeedRow[] = [];
  const updated: { before: Service; after: ServicesImportSeedRow }[] = [];
  let unchanged = 0;

  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${row.category}`;
    const match = byKey.get(key);
    if (!match) {
      insert.run(
        row.name,
        row.category,
        row.subcategory,
        row.defaultPrice,
        row.taxRate,
        row.priceIsStartingFrom ? 1 : 0,
        row.sortOrder,
        row.notes,
        row.isActive ? 1 : 0,
        row.isBookmarked ? 1 : 0,
        row.keywords
      );
      added.push(row);
      continue;
    }
    if (seedRowsEqual(match, row)) {
      unchanged++;
      continue;
    }
    update.run(
      row.subcategory,
      row.defaultPrice,
      row.taxRate,
      row.priceIsStartingFrom ? 1 : 0,
      row.sortOrder,
      row.notes,
      row.keywords,
      match.id
    );
    updated.push({ before: match, after: row });
  }

  return { added, updated, unchanged };
}

function bootstrapDatabase() {
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  const db = initDatabase(dbPath);
  const sqlite = getSqlite();

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS center_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      center_name TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      mobile TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      udyam_number TEXT NOT NULL DEFAULT '',
      logo_path TEXT,
      upi_qr_path TEXT,
      upi_id TEXT,
      invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
      invoice_number INTEGER NOT NULL DEFAULT 0,
      theme TEXT NOT NULL DEFAULT 'light',
      default_tax_rate REAL NOT NULL DEFAULT 0,
      default_payment_mode TEXT NOT NULL DEFAULT 'Cash',
      last_backup_date INTEGER,
      pin_hash TEXT,
      operating_hours TEXT NOT NULL DEFAULT '',
      center_description TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL DEFAULT '',
      remarks TEXT,
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'Other Services',
      subcategory TEXT NOT NULL DEFAULT '',
      default_price REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      price_is_starting_from INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_bookmarked INTEGER NOT NULL DEFAULT 0,
      keywords TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      subtotal REAL NOT NULL,
      tax_total REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'Cash',
      status TEXT NOT NULL DEFAULT 'PAID',
      notes TEXT,
      customer_notes TEXT,
      printed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id),
      description TEXT NOT NULL,
      qty INTEGER NOT NULL,
      rate REAL NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS faq_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      tags TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS service_checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      document_name TEXT NOT NULL,
      is_required INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      service_interest TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'NEW',
      notes TEXT,
      created_at INTEGER NOT NULL,
      converted_customer_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS message_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'whatsapp',
      body TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_services_category_sort ON services(category, sort_order);
  `);

  // Migration: services schema additions are additive only and idempotent.
  const cols = sqlite
    .prepare("PRAGMA table_info(services)")
    .all() as { name: string }[];
  const haveSvc = new Set(cols.map((c) => c.name));
  if (!haveSvc.has("is_bookmarked")) {
    sqlite.exec(
      "ALTER TABLE services ADD COLUMN is_bookmarked INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!haveSvc.has("subcategory")) {
    sqlite.exec(
      "ALTER TABLE services ADD COLUMN subcategory TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!haveSvc.has("price_is_starting_from")) {
    sqlite.exec(
      "ALTER TABLE services ADD COLUMN price_is_starting_from INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!haveSvc.has("sort_order")) {
    sqlite.exec(
      "ALTER TABLE services ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!haveSvc.has("notes")) {
    sqlite.exec(
      "ALTER TABLE services ADD COLUMN notes TEXT NOT NULL DEFAULT ''"
    );
  }

  // Migration: add printer columns to center_profiles if missing
  const cpCols = sqlite
    .prepare("PRAGMA table_info(center_profiles)")
    .all() as { name: string }[];
  if (!cpCols.find((c) => c.name === "printer_interface")) {
    sqlite.exec(`
      ALTER TABLE center_profiles ADD COLUMN printer_interface TEXT NOT NULL DEFAULT 'tcp://192.168.1.100:9100';
      ALTER TABLE center_profiles ADD COLUMN printer_type TEXT NOT NULL DEFAULT 'EPSON';
      ALTER TABLE center_profiles ADD COLUMN print_upi_qr INTEGER NOT NULL DEFAULT 0;
    `);
  }

  // Seed a single center profile row.
  const profileCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM center_profiles")
    .get() as { count: number };
  if (profileCount.count === 0) {
    db.insert(schema.centerProfiles).values({}).run();
  }

  // Seed the canonical CSC catalogue from the bundled CSV — fresh DBs only.
  // Existing installs are never re-seeded automatically; the operator must
  // trigger a manual import (Phase 2 UI) via SERVICES_IMPORT_CSV.
  const serviceCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM services")
    .get() as { count: number };
  if (serviceCount.count === 0) {
    const seedPath = resolveSeedCsvPath();
    if (!seedPath) {
      console.warn(
        "[seed] services-seed.csv not found — starting with an empty service catalogue."
      );
    } else {
      try {
        const text = fs.readFileSync(seedPath, "utf8");
        const parsed = parseCsv(text);
        const { rows: seedRows, skipped } = normalizeSeedRows(parsed.rows);
        const tx = sqlite.transaction(() => applyServiceSeed(seedRows));
        const result = tx();
        console.log(
          `[seed] services seeded from ${seedPath}: ` +
            `added=${result.added.length}, skipped=${skipped.length + parsed.errors.length}`
        );
        if (skipped.length > 0) {
          for (const s of skipped) {
            console.warn(`[seed] row ${s.row} skipped: ${s.reason}`);
          }
        }
      } catch (err) {
        console.error("[seed] failed to seed services from CSV:", err);
      }
    }
  }

  return db;
}

// ── Window ───────────────────────────────────────────────────────────────────
const DEV_URL = "http://localhost:3000";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, "../public/icon.svg"),
  });

  // Lock navigation and new-window opens to our own origin.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(DEV_URL) && !url.startsWith("file://")) e.preventDefault();
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    startStandaloneServer();
  }
}

// Boot the Next.js standalone server inside the Electron process tree using
// the shipped Electron binary with ELECTRON_RUN_AS_NODE=1 (no system node).
function startStandaloneServer() {
  const serverPath = path.join(
    process.resourcesPath,
    "app",
    ".next",
    "standalone",
    "server.js"
  );
  if (!fs.existsSync(serverPath)) {
    console.error("[standalone] server.js not found at", serverPath);
    return;
  }

  nextProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: "3000",
      HOSTNAME: "127.0.0.1",
      DATABASE_URL: `file:${dbPath}`,
      USER_DATA_PATH: userDataPath,
    },
  });

  let loaded = false;
  const tryLoad = () => {
    if (loaded || !mainWindow) return;
    loaded = true;
    mainWindow.loadURL(DEV_URL);
  };

  nextProcess.stdout?.on("data", (data: Buffer) => {
    const output = data.toString();
    console.log(`[next] ${output}`);
    if (output.includes("Ready") || output.includes("ready")) tryLoad();
  });
  nextProcess.stderr?.on("data", (d: Buffer) =>
    console.error(`[next:err] ${d}`)
  );

  setTimeout(tryLoad, 6000);
}

// ── IPC handler registration ────────────────────────────────────────────────
function registerIpcHandlers() {
  const db = getDb();

  // App
  safeHandle(IPC.APP_VERSION, () => app.getVersion());
  safeHandle(IPC.APP_DB_PATH, () => dbPath);

  // Center profile — single-row table (id = 1).
  safeHandle(IPC.CENTER_GET, () =>
    db.select().from(schema.centerProfiles).get()
  );
  safeHandle(IPC.CENTER_UPDATE, (_e, raw) => {
    const data = parseArg(
      centerProfileSchema.partial(),
      raw,
      "center:update"
    );
    db.update(schema.centerProfiles)
      .set(data)
      .where(eq(schema.centerProfiles.id, 1))
      .run();
    return db.select().from(schema.centerProfiles).get();
  });

  // Customers
  safeHandle(IPC.CUSTOMERS_LIST, () =>
    db
      .select({
        ...getTableColumns(schema.customers),
        invoiceCount: sql<number>`count(${schema.invoices.id})`.mapWith(Number),
        totalBilled: sql<number>`COALESCE(sum(${schema.invoices.total}), 0)`.mapWith(
          Number
        ),
      })
      .from(schema.customers)
      .leftJoin(
        schema.invoices,
        and(eq(schema.customers.id, schema.invoices.customerId), notCancelled)
      )
      .groupBy(schema.customers.id)
      .all()
  );
  safeHandle(IPC.CUSTOMERS_GET, (_e, id) =>
    db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, z.number().int().parse(id)))
      .get()
  );
  safeHandle(IPC.CUSTOMERS_CREATE, (_e, raw) => {
    const data = parseArg(
      customerSchema.omit({ id: true }),
      raw,
      "customers:create"
    );
    return db.insert(schema.customers).values(data).returning().get();
  });
  safeHandle(IPC.CUSTOMERS_UPDATE, (_e, id, raw) => {
    const _id = z.number().int().parse(id);
    const data = parseArg(
      customerSchema.partial(),
      raw,
      "customers:update"
    );
    return db
      .update(schema.customers)
      .set(data)
      .where(eq(schema.customers.id, _id))
      .returning()
      .get();
  });
  safeHandle(IPC.CUSTOMERS_DELETE, (_e, id) => {
    const _id = z.number().int().parse(id);
    db.delete(schema.customers)
      .where(eq(schema.customers.id, _id))
      .run();
    return { success: true };
  });
  safeHandle(IPC.CUSTOMERS_SEARCH, (_e, query) => {
    const q = z.string().parse(query);
    const pattern = `%${q}%`;
    return db
      .select({
        ...getTableColumns(schema.customers),
        invoiceCount: sql<number>`count(${schema.invoices.id})`.mapWith(Number),
        totalBilled: sql<number>`COALESCE(sum(${schema.invoices.total}), 0)`.mapWith(
          Number
        ),
      })
      .from(schema.customers)
      .leftJoin(
        schema.invoices,
        and(eq(schema.customers.id, schema.invoices.customerId), notCancelled)
      )
      .where(
        sql`${schema.customers.name} LIKE ${pattern} OR ${schema.customers.mobile} LIKE ${pattern}`
      )
      .groupBy(schema.customers.id)
      .all();
  });

  // Services
  safeHandle(IPC.SERVICES_LIST, () =>
    db.select().from(schema.services).all()
  );
  safeHandle(IPC.SERVICES_GET, (_e, id) =>
    db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, z.number().int().parse(id)))
      .get()
  );
  safeHandle(IPC.SERVICES_CREATE, (_e, raw) => {
    const data = parseArg(
      serviceSchema.omit({ id: true }),
      raw,
      "services:create"
    );
    return db.insert(schema.services).values(data).returning().get();
  });
  safeHandle(IPC.SERVICES_UPDATE, (_e, id, raw) => {
    const _id = z.number().int().parse(id);
    const data = parseArg(serviceSchema.partial(), raw, "services:update");
    return db
      .update(schema.services)
      .set(data)
      .where(eq(schema.services.id, _id))
      .returning()
      .get();
  });
  safeHandle(IPC.SERVICES_DELETE, (_e, id) => {
    const _id = z.number().int().parse(id);
    db.delete(schema.services)
      .where(eq(schema.services.id, _id))
      .run();
    return { success: true };
  });
  safeHandle(IPC.SERVICES_TOGGLE_BOOKMARK, (_e, id) => {
    const _id = z.number().int().parse(id);
    const svc = db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, _id))
      .get();
    if (!svc) throw new Error("Service not found");
    return db
      .update(schema.services)
      .set({ isBookmarked: !svc.isBookmarked })
      .where(eq(schema.services.id, _id))
      .returning()
      .get();
  });
  safeHandle(IPC.SERVICES_GET_BOOKMARKED, () =>
    db
      .select()
      .from(schema.services)
      .where(
        and(
          eq(schema.services.isBookmarked, true),
          eq(schema.services.isActive, true)
        )
      )
      .all()
  );

  // Bulk import the services catalogue from CSV. Two modes:
  //   - "preview": runs the diff in a SAVEPOINT and rolls it back.
  //   - "commit":  applies the diff in a single transaction with a backup
  //                snapshot table written before the changes.
  // Operator-managed flags (is_active, is_bookmarked) are NEVER overwritten
  // on existing rows; they only apply to brand-new inserts.
  safeHandle(IPC.SERVICES_IMPORT_CSV, (_e, raw) => {
    const { csv, mode } = parseArg(
      servicesImportSchema,
      raw,
      "services:import-csv"
    );
    const parsed = parseCsv(csv);
    const { rows, skipped } = normalizeSeedRows(parsed.rows);
    const parseSkipped = parsed.errors.map((e) => ({
      row: e.line,
      reason: e.message,
    }));

    const sqlite = getSqlite();

    if (mode === "preview") {
      // Apply inside a SAVEPOINT, capture the diff, then roll back so no
      // rows are mutated.
      let preview!: ReturnType<typeof applyServiceSeed>;
      sqlite.exec("SAVEPOINT svc_import_preview");
      try {
        preview = applyServiceSeed(rows);
      } finally {
        sqlite.exec("ROLLBACK TO SAVEPOINT svc_import_preview");
        sqlite.exec("RELEASE SAVEPOINT svc_import_preview");
      }
      const result: ServicesImportResult = {
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
      return result;
    }

    // commit mode — single transaction, with a backup snapshot table.
    const ts = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const backupTable = `services_backup_${ts}`;

    const tx = sqlite.transaction(() => {
      sqlite.exec(
        `CREATE TABLE IF NOT EXISTS "${backupTable}" AS SELECT * FROM services`
      );
      return applyServiceSeed(rows);
    });

    const applied = tx();
    const result: ServicesImportResult = {
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
    return result;
  });

  // Load the bundled seed catalogue and apply it via the same import logic.
  // Preview shows the diff without mutating; commit applies inside one
  // transaction with a backup snapshot. Same preservation rules as
  // SERVICES_IMPORT_CSV (operator-state never overwritten; no deletes).
  safeHandle(IPC.SERVICES_LOAD_SEED_CATALOGUE, (_e, raw) => {
    const { mode } = parseArg(
      z.object({ mode: z.enum(["preview", "commit"]) }),
      raw,
      "services:load-seed-catalogue"
    );
    const seedPath = resolveSeedCsvPath();
    if (!seedPath) {
      throw new Error(
        "Bundled seed catalogue not found. Reinstall or import a CSV manually."
      );
    }
    const text = fs.readFileSync(seedPath, "utf8");
    const parsed = parseCsv(text);
    const { rows, skipped } = normalizeSeedRows(parsed.rows);
    const parseSkipped = parsed.errors.map((e) => ({
      row: e.line,
      reason: e.message,
    }));
    const sqlite = getSqlite();

    if (mode === "preview") {
      let preview!: ReturnType<typeof applyServiceSeed>;
      sqlite.exec("SAVEPOINT svc_seed_preview");
      try {
        preview = applyServiceSeed(rows);
      } finally {
        sqlite.exec("ROLLBACK TO SAVEPOINT svc_seed_preview");
        sqlite.exec("RELEASE SAVEPOINT svc_seed_preview");
      }
      const result: ServicesImportResult = {
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
      return result;
    }

    const ts = new Date()
      .toISOString()
      .replace(/[-:T]/g, "")
      .slice(0, 14);
    const backupTable = `services_backup_${ts}`;
    const tx = sqlite.transaction(() => {
      sqlite.exec(
        `CREATE TABLE IF NOT EXISTS "${backupTable}" AS SELECT * FROM services`
      );
      return applyServiceSeed(rows);
    });
    const applied = tx();
    const result: ServicesImportResult = {
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
    return result;
  });

  // Bulk patch services. Single transaction; cap enforced by Zod (500).
  safeHandle(IPC.SERVICES_BULK_UPDATE, (_e, raw) => {
    const { ids, patch } = parseArg(
      bulkUpdateServicesSchema,
      raw,
      "services:bulk-update"
    );
    const sqlite = getSqlite();
    const tx = sqlite.transaction(() => {
      let count = 0;
      for (const id of ids) {
        const r = db
          .update(schema.services)
          .set(patch)
          .where(eq(schema.services.id, id))
          .run();
        count += r.changes;
      }
      return count;
    });
    return { updated: tx() };
  });

  // Bulk delete services with the existing in-use guard. Rows referenced by
  // any invoiceItems are skipped and returned in `skippedInUse`; the rest
  // delete in a single transaction.
  safeHandle(IPC.SERVICES_BULK_DELETE, (_e, raw) => {
    const { ids } = parseArg(
      bulkDeleteServicesSchema,
      raw,
      "services:bulk-delete"
    );
    const sqlite = getSqlite();
    const inUseRows = sqlite
      .prepare(
        `SELECT DISTINCT service_id as id FROM invoice_items
           WHERE service_id IN (${ids.map(() => "?").join(",")})`
      )
      .all(...ids) as { id: number }[];
    const skippedInUse = inUseRows.map((r) => r.id);
    const inUseSet = new Set(skippedInUse);
    const safeIds = ids.filter((id) => !inUseSet.has(id));

    const tx = sqlite.transaction(() => {
      let count = 0;
      for (const id of safeIds) {
        const r = db
          .delete(schema.services)
          .where(eq(schema.services.id, id))
          .run();
        count += r.changes;
      }
      return count;
    });

    const result: BulkDeleteServicesResult = {
      deleted: tx(),
      skippedInUse,
    };
    return result;
  });

  // Service checklist (per-service required documents). Read-only list +
  // bulk replace-all upsert. Used by the Service Edit modal.
  safeHandle(IPC.SERVICE_CHECKLIST_LIST, (_e, raw) => {
    const { serviceId } = parseArg(
      z.object({ serviceId: z.number().int().positive() }),
      raw,
      "service-checklist:list"
    );
    return db
      .select()
      .from(schema.serviceChecklists)
      .where(eq(schema.serviceChecklists.serviceId, serviceId))
      .orderBy(schema.serviceChecklists.sortOrder)
      .all();
  });

  safeHandle(IPC.SERVICE_CHECKLIST_UPSERT_BULK, (_e, raw) => {
    const { serviceId, items } = parseArg(
      checklistUpsertBulkSchema,
      raw,
      "service-checklist:upsert-bulk"
    );
    const sqlite = getSqlite();
    const tx = sqlite.transaction(() => {
      const existing = db
        .select()
        .from(schema.serviceChecklists)
        .where(eq(schema.serviceChecklists.serviceId, serviceId))
        .all();
      const keepIds = new Set(
        items.filter((i) => i.id !== undefined).map((i) => i.id as number)
      );
      // Delete rows not present in the payload.
      for (const e of existing) {
        if (!keepIds.has(e.id)) {
          db.delete(schema.serviceChecklists)
            .where(eq(schema.serviceChecklists.id, e.id))
            .run();
        }
      }
      // Upsert each payload row preserving submission order via sortOrder
      // when the caller hasn't supplied one explicitly.
      items.forEach((item, idx) => {
        const ord = item.sortOrder ?? idx;
        if (item.id !== undefined) {
          db.update(schema.serviceChecklists)
            .set({
              documentName: item.documentName,
              isRequired: item.isRequired,
              notes: item.notes,
              sortOrder: ord,
            })
            .where(eq(schema.serviceChecklists.id, item.id))
            .run();
        } else {
          db.insert(schema.serviceChecklists)
            .values({
              serviceId,
              documentName: item.documentName,
              isRequired: item.isRequired,
              notes: item.notes,
              sortOrder: ord,
            })
            .run();
        }
      });
      return db
        .select()
        .from(schema.serviceChecklists)
        .where(eq(schema.serviceChecklists.serviceId, serviceId))
        .orderBy(schema.serviceChecklists.sortOrder)
        .all();
    });
    return tx();
  });

  // Invoices — atomic invoice-number generation inside the transaction.
  safeHandle(IPC.INVOICES_LIST, () =>
    db.query.invoices.findMany({
      with: { customer: true, items: true },
      orderBy: [desc(schema.invoices.createdAt)],
    })
  );
  safeHandle(IPC.INVOICES_GET, (_e, id) =>
    db.query.invoices.findFirst({
      where: eq(schema.invoices.id, z.number().int().parse(id)),
      with: { customer: true, items: { with: { service: true } } },
    })
  );
  safeHandle(IPC.INVOICES_CREATE, (_e, raw) => {
    const data = parseArg(createInvoiceSchema, raw, "invoices:create");
    const sqlite = getSqlite();

    return sqlite.transaction(() => {
      // Resolve customer (existing or create new).
      let customerId = data.customerId;
      if (!customerId && data.newCustomer) {
        const created = db
          .insert(schema.customers)
          .values({
            name: data.newCustomer.name,
            mobile: data.newCustomer.mobile,
          })
          .returning()
          .get();
        customerId = created.id;
      }
      if (!customerId) throw new Error("customerId or newCustomer required");

      // Atomically read + bump the invoice counter.
      const profile = db
        .select()
        .from(schema.centerProfiles)
        .where(eq(schema.centerProfiles.id, 1))
        .get();
      const prefix = profile?.invoicePrefix ?? "INV-";
      const seq = (profile?.invoiceNumber ?? 0) + 1;
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
        d.getDate()
      ).padStart(2, "0")}`;
      const invoiceNo = `${prefix}${ymd}-${String(seq).padStart(3, "0")}`;

      // Compute totals server-side as a guard against tampering.
      const items = data.items.map((it) => {
        const rate = it.taxRate ?? 0;
        const base = it.qty * it.rate;
        const tax = +(base * (rate / 100)).toFixed(2);
        return { ...it, taxRate: rate, lineTotal: +(base + tax).toFixed(2), tax };
      });
      const subtotal = +items
        .reduce((s, it) => s + it.qty * it.rate, 0)
        .toFixed(2);
      const taxTotal = +items.reduce((s, it) => s + it.tax, 0).toFixed(2);
      const discount = data.discount ?? 0;
      const total = +(subtotal + taxTotal - discount).toFixed(2);

      const invoice = db
        .insert(schema.invoices)
        .values({
          customerId,
          invoiceNo,
          subtotal,
          taxTotal,
          discount,
          total,
          paymentMode: data.paymentMode ?? "Cash",
          status: data.status ?? "PAID",
          notes: data.notes ?? null,
          customerNotes: data.customerNotes ?? null,
        })
        .returning()
        .get();

      for (const it of items) {
        db.insert(schema.invoiceItems)
          .values({
            invoiceId: invoice.id,
            serviceId: it.serviceId,
            description: it.description,
            qty: it.qty,
            rate: it.rate,
            taxRate: it.taxRate,
            lineTotal: it.lineTotal,
          })
          .run();
      }

      db.update(schema.centerProfiles)
        .set({ invoiceNumber: seq })
        .where(eq(schema.centerProfiles.id, 1))
        .run();

      return { id: invoice.id, invoiceNo: invoice.invoiceNo };
    })();
  });

  safeHandle(IPC.INVOICES_UPDATE, (_e, id, raw) => {
    const _id = z.number().int().parse(id);
    const data = parseArg(createInvoiceSchema, raw, "invoices:update");
    if (data.status && data.status !== "PAID" && data.status !== "PENDING") {
      throw new Error(
        "Edit can only save as PAID or PENDING. Use status update for CANCELLED."
      );
    }
    const sqlite = getSqlite();

    return sqlite.transaction(() => {
      // Fetch the existing invoice to verify it is PENDING
      const existing = db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.id, _id))
        .get();

      if (!existing) throw new Error("Invoice not found");
      if (existing.status !== "PENDING") {
        throw new Error("Only PENDING invoices can be edited");
      }

      // Resolve customer
      let customerId = data.customerId;
      if (!customerId && data.newCustomer) {
        const created = db
          .insert(schema.customers)
          .values({
            name: data.newCustomer.name,
            mobile: data.newCustomer.mobile,
          })
          .returning()
          .get();
        customerId = created.id;
      }
      if (!customerId) throw new Error("customerId or newCustomer required");

      // Compute totals server-side
      const items = data.items.map((it) => {
        const rate = it.taxRate ?? 0;
        const base = it.qty * it.rate;
        const tax = +(base * (rate / 100)).toFixed(2);
        return { ...it, taxRate: rate, lineTotal: +(base + tax).toFixed(2), tax };
      });
      const subtotal = +items
        .reduce((s, it) => s + it.qty * it.rate, 0)
        .toFixed(2);
      const taxTotal = +items.reduce((s, it) => s + it.tax, 0).toFixed(2);
      const discount = data.discount ?? 0;
      const total = +(subtotal + taxTotal - discount).toFixed(2);

      // Update invoice in place
      db.update(schema.invoices)
        .set({
          customerId,
          subtotal,
          taxTotal,
          discount,
          total,
          paymentMode: data.paymentMode ?? "Cash",
          status: data.status ?? "PENDING",
          notes: data.notes ?? null,
          customerNotes: data.customerNotes ?? null,
          // Edits invalidate any previously-printed copy: the user must
          // re-print or re-export the PDF to reflect the new content.
          printedAt: null,
        })
        .where(eq(schema.invoices.id, _id))
        .run();

      // Clear existing items and replace
      db.delete(schema.invoiceItems)
        .where(eq(schema.invoiceItems.invoiceId, _id))
        .run();

      for (const it of items) {
        db.insert(schema.invoiceItems)
          .values({
            invoiceId: _id,
            serviceId: it.serviceId,
            description: it.description,
            qty: it.qty,
            rate: it.rate,
            taxRate: it.taxRate,
            lineTotal: it.lineTotal,
          })
          .run();
      }

      return { id: _id, invoiceNo: existing.invoiceNo };
    })();
  });

  safeHandle(IPC.INVOICES_UPDATE_STATUS, (_e, id, status) => {
    const _id = z.number().int().parse(id);
    const _status = InvoiceStatus.parse(status);
    return db
      .update(schema.invoices)
      .set({ status: _status })
      .where(eq(schema.invoices.id, _id))
      .returning()
      .get();
  });
  safeHandle(IPC.INVOICES_DELETE, (_e, id) => {
    const _id = z.number().int().parse(id);
    const sqlite = getSqlite();
    sqlite.transaction(() => {
      db.delete(schema.invoiceItems)
        .where(eq(schema.invoiceItems.invoiceId, _id))
        .run();
      db.delete(schema.invoices)
        .where(eq(schema.invoices.id, _id))
        .run();
    })();
    return { success: true };
  });
  safeHandle(IPC.INVOICES_GENERATE_PDF, async (_e, rawId, rawOpts) => {
    const id = z.number().int().positive().parse(rawId);
    const opts = z
      .object({ silent: z.boolean().optional() })
      .optional()
      .parse(rawOpts) ?? {};

    const invoice = db.query.invoices
      .findFirst({
        where: eq(schema.invoices.id, id),
        with: { customer: true, items: { with: { service: true } } },
      })
      .sync();
    if (!invoice) throw new Error(`Invoice ${id} not found`);

    const center =
      db
        .select()
        .from(schema.centerProfiles)
        .where(eq(schema.centerProfiles.id, 1))
        .get() ?? null;

    const safeName = invoice.invoiceNo.replace(/[^A-Za-z0-9_-]/g, "_");
    const defaultPath = path.join(
      app.getPath("downloads"),
      `${safeName}.pdf`
    );

    let outPath = defaultPath;
    if (!opts.silent && mainWindow) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Save Invoice PDF",
        defaultPath,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (result.canceled || !result.filePath) {
        return { cancelled: true };
      }
      outPath = result.filePath;
    }

    await generateInvoicePdf(invoice, center, outPath);

    // Stamp printedAt so the list reflects that the invoice has been produced.
    db.update(schema.invoices)
      .set({ printedAt: new Date() })
      .where(eq(schema.invoices.id, id))
      .run();

    return { path: outPath };
  });

  // Reports
  safeHandle(IPC.REPORTS_DAILY, (_e, dateStr) => {
    const _date = z.string().parse(dateStr);
    const start = new Date(_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(_date);
    end.setHours(23, 59, 59, 999);
    return db.query.invoices.findMany({
      where: and(
        gte(schema.invoices.createdAt, start),
        lte(schema.invoices.createdAt, end)
      ),
      with: { customer: true, items: true },
    });
  });
  safeHandle(IPC.REPORTS_RANGE, (_e, startStr, endStr) => {
    const s = z.string().parse(startStr);
    const e = z.string().parse(endStr);
    const start = new Date(s);
    start.setHours(0, 0, 0, 0);
    const end = new Date(e);
    end.setHours(23, 59, 59, 999);
    return db.query.invoices.findMany({
      where: and(
        gte(schema.invoices.createdAt, start),
        lte(schema.invoices.createdAt, end)
      ),
      with: { customer: true, items: true },
      orderBy: [desc(schema.invoices.createdAt)],
    });
  });

  // ── Reports — aggregated, lightweight payloads ────────────────────────────
  const rangeSchema = z.object({ start: z.string(), end: z.string() });
  const topNSchema = z.object({
    start: z.string(),
    end: z.string(),
    limit: z.number().int().positive().max(50).optional(),
  });

  function parseRange(raw: unknown) {
    const { start, end } = parseArg(rangeSchema, raw, "reports:range");
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  safeHandle(IPC.REPORTS_SUMMARY, (_e, raw) => {
    const { startDate, endDate } = parseRange(raw);
    const inRange = and(
      gte(schema.invoices.createdAt, startDate),
      lte(schema.invoices.createdAt, endDate)
    );

    const totals = db
      .select({
        invoiceCount: sql<number>`COUNT(*)`.mapWith(Number),
        subtotal: sql<number>`COALESCE(SUM(${schema.invoices.subtotal}), 0)`.mapWith(Number),
        taxTotal: sql<number>`COALESCE(SUM(${schema.invoices.taxTotal}), 0)`.mapWith(Number),
        discount: sql<number>`COALESCE(SUM(${schema.invoices.discount}), 0)`.mapWith(Number),
        revenue: sql<number>`COALESCE(SUM(${schema.invoices.total}), 0)`.mapWith(Number),
      })
      .from(schema.invoices)
      .where(and(inRange, notCancelled))
      .get() ?? { invoiceCount: 0, subtotal: 0, taxTotal: 0, discount: 0, revenue: 0 };

    const byStatusRows = db
      .select({
        status: schema.invoices.status,
        count: sql<number>`COUNT(*)`.mapWith(Number),
        total: sql<number>`COALESCE(SUM(${schema.invoices.total}), 0)`.mapWith(Number),
      })
      .from(schema.invoices)
      .where(inRange)
      .groupBy(schema.invoices.status)
      .all();

    const byStatus = {
      PAID: { count: 0, total: 0 },
      PENDING: { count: 0, total: 0 },
      CANCELLED: { count: 0, total: 0 },
    } as Record<"PAID" | "PENDING" | "CANCELLED", { count: number; total: number }>;
    for (const row of byStatusRows) {
      const key = row.status as keyof typeof byStatus;
      if (byStatus[key]) byStatus[key] = { count: row.count, total: row.total };
    }

    const byPaymentMode = db
      .select({
        paymentMode: schema.invoices.paymentMode,
        count: sql<number>`COUNT(*)`.mapWith(Number),
        total: sql<number>`COALESCE(SUM(${schema.invoices.total}), 0)`.mapWith(Number),
      })
      .from(schema.invoices)
      .where(and(inRange, notCancelled))
      .groupBy(schema.invoices.paymentMode)
      .all();

    return { totals, byStatus, byPaymentMode };
  });

  safeHandle(IPC.REPORTS_TOP_CUSTOMERS, (_e, raw) => {
    const { start, end, limit } = parseArg(topNSchema, raw, "reports:top-customers");
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const revenueExpr = sql<number>`COALESCE(SUM(${schema.invoices.total}), 0)`
      .mapWith(Number)
      .as("revenue");

    return db
      .select({
        customerId: schema.customers.id,
        customerName: schema.customers.name,
        invoiceCount: sql<number>`COUNT(${schema.invoices.id})`.mapWith(Number),
        revenue: revenueExpr,
      })
      .from(schema.invoices)
      .innerJoin(
        schema.customers,
        eq(schema.invoices.customerId, schema.customers.id)
      )
      .where(
        and(
          gte(schema.invoices.createdAt, startDate),
          lte(schema.invoices.createdAt, endDate),
          notCancelled
        )
      )
      .groupBy(schema.customers.id)
      .orderBy(desc(revenueExpr))
      .limit(limit ?? 5)
      .all();
  });

  safeHandle(IPC.REPORTS_TOP_SERVICES, (_e, raw) => {
    const { start, end, limit } = parseArg(topNSchema, raw, "reports:top-services");
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const revenueExpr = sql<number>`COALESCE(SUM(${schema.invoiceItems.lineTotal}), 0)`
      .mapWith(Number)
      .as("revenue");

    return db
      .select({
        serviceId: schema.services.id,
        serviceName: schema.services.name,
        category: schema.services.category,
        qty: sql<number>`COALESCE(SUM(${schema.invoiceItems.qty}), 0)`.mapWith(Number),
        revenue: revenueExpr,
      })
      .from(schema.invoiceItems)
      .innerJoin(
        schema.invoices,
        eq(schema.invoiceItems.invoiceId, schema.invoices.id)
      )
      .innerJoin(
        schema.services,
        eq(schema.invoiceItems.serviceId, schema.services.id)
      )
      .where(
        and(
          gte(schema.invoices.createdAt, startDate),
          lte(schema.invoices.createdAt, endDate),
          notCancelled
        )
      )
      .groupBy(schema.services.id)
      .orderBy(desc(revenueExpr))
      .limit(limit ?? 5)
      .all();
  });

  safeHandle(IPC.REPORTS_PENDING_DUES, () => {
    const row = db
      .select({
        count: sql<number>`COUNT(*)`.mapWith(Number),
        total: sql<number>`COALESCE(SUM(${schema.invoices.total}), 0)`.mapWith(Number),
      })
      .from(schema.invoices)
      .where(eq(schema.invoices.status, "PENDING"))
      .get();
    return row ?? { count: 0, total: 0 };
  });

  // Printer
  safeHandle(IPC.PRINTER_GET_CONFIG, () => {
    const p = db.select().from(schema.centerProfiles).where(eq(schema.centerProfiles.id, 1)).get();
    return {
      interface: p?.printerInterface ?? "tcp://192.168.1.100:9100",
      type: p?.printerType ?? "EPSON",
      printUpiQr: p?.printUpiQr ?? false,
    };
  });
  safeHandle(IPC.PRINTER_LIST, () => scanForPrinters());
  safeHandle(IPC.PRINTER_TEST, async (_e, rawCfg) => {
    let cfg = rawCfg;
    if (!cfg) {
      const p = db.select().from(schema.centerProfiles).where(eq(schema.centerProfiles.id, 1)).get();
      cfg = {
        interface: p?.printerInterface ?? "tcp://192.168.1.100:9100",
        type: p?.printerType ?? "EPSON",
        printUpiQr: p?.printUpiQr ?? false,
      };
    }
    await printTestPage(cfg as any);
    return { success: true };
  });
  safeHandle(IPC.PRINTER_PRINT_RECEIPT, async (_e, rawId) => {
    const id = z.number().int().positive().parse(rawId);
    const invoice = db.query.invoices
      .findFirst({
        where: eq(schema.invoices.id, id),
        with: { customer: true, items: { with: { service: true } } },
      })
      .sync();
    if (!invoice) throw new Error(`Invoice ${id} not found`);
    const center =
      db
        .select()
        .from(schema.centerProfiles)
        .where(eq(schema.centerProfiles.id, 1))
        .get() ?? null;
        
    const printerConfig = {
      interface: center?.printerInterface ?? "tcp://192.168.1.100:9100",
      type: center?.printerType ?? "EPSON",
      printUpiQr: center?.printUpiQr ?? false,
    };
    
    await printReceipt(printerConfig, invoice, center);
    db.update(schema.invoices)
      .set({ printedAt: new Date() })
      .where(eq(schema.invoices.id, id))
      .run();
    return { success: true };
  });

  // Backup
  safeHandle(IPC.BACKUP_EXPORT, async () => {
    const backupDir = path.join(app.getPath("documents"), "CSC-Backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const out = path.join(backupDir, `csc_billing_${stamp}.db`);
    await getSqlite().backup(out);
    return { success: true, path: out };
  });
  safeHandle(IPC.BACKUP_IMPORT, async () => {
    if (!mainWindow) return { error: "No active window" };
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import Backup",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, cancelled: true };
    }
    
    // Safety snapshot before overwriting
    if (fs.existsSync(dbPath)) {
      await getSqlite().backup(dbPath + ".pre-import.bak");
    }

    closeDatabase();
    
    // Safety cleanup: Ensure orphaned WAL/SHM files do not corrupt the imported DB
    const walPath = dbPath + "-wal";
    const shmPath = dbPath + "-shm";
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
      console.log("[backup] Deleted orphaned WAL file");
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
      console.log("[backup] Deleted orphaned SHM file");
    }

    fs.copyFileSync(result.filePaths[0], dbPath);
    initDatabase(dbPath);
    return { success: true, path: result.filePaths[0] };
  });
}

// ── Auto-backup on quit ──────────────────────────────────────────────────────
async function performAutoBackup() {
  if (!fs.existsSync(dbPath)) return;
  const backupDir = path.join(app.getPath("documents"), "CSC-Backups");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
  const out = path.join(backupDir, `csc_billing_auto_${stamp}.db`);
  if (fs.existsSync(out)) return;
  
  try {
    await getSqlite().backup(out);
  } catch (err) {
    console.error("[auto-backup export]", err);
    return;
  }
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("csc_billing_auto_") && f.endsWith(".db"))
    .sort()
    .reverse();
  for (let i = 7; i < files.length; i++) {
    fs.unlinkSync(path.join(backupDir, files[i]));
  }
}

// ── Daily digest notification (8 PM check) ───────────────────────────────────
function scheduleDailyDigest() {
  setInterval(
    () => {
      const now = new Date();
      if (now.getHours() !== 20 || now.getMinutes() >= 30) return;
      const today = now.toISOString().split("T")[0];
      if (digestShownToday === today) return;
      digestShownToday = today;
      try {
        const db = getDb();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const invoices = db.query.invoices.findMany({
          where: and(
            gte(schema.invoices.createdAt, start),
            lte(schema.invoices.createdAt, end)
          ),
        }).sync();
        const total = invoices.reduce(
          (s: number, i: { total: number }) => s + (i.total || 0),
          0
        );
        if (Notification.isSupported()) {
          new Notification({
            title: "CSC Billing — Daily Summary",
            body: `Today: ${invoices.length} invoices, Total: ₹${total.toFixed(0)}`,
          }).show();
        }
      } catch (err) {
        console.error("[daily-digest]", err);
      }
    },
    30 * 60 * 1000
  );
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  bootstrapDatabase();
  registerIpcHandlers();
  createWindow();
  scheduleDailyDigest();

  if (app.isPackaged && process.env.UPDATE_FEED) {
    autoUpdater
      .checkForUpdatesAndNotify()
      .catch((e) => console.error("[auto-update]", e));
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

let quitting = false;
app.on("before-quit", (event) => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  (async () => {
    try {
      await performAutoBackup();
    } catch (err) {
      console.error("[auto-backup]", err);
    }
    try {
      closeDatabase();
    } catch {
      // ignore shutdown errors
    }
    if (nextProcess) nextProcess.kill();
    app.exit(0);
  })();
});
