// src/main/index.ts
// Electron main process: DB bootstrap, IPC handlers, window, standalone Next server.

import { app, BrowserWindow, ipcMain, dialog, Notification } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import path from "path";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";
import { autoUpdater } from "electron-updater";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
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
} from "../shared/types";
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

// ── Printer config (in-memory) ───────────────────────────────────────────────
interface PrinterConfig {
  interface: string;
  type: string;
  printUpiQr: boolean;
}
let printerConfig: PrinterConfig = {
  interface: "tcp://192.168.1.100:9100",
  type: "EPSON",
  printUpiQr: false,
};

// ── DB bootstrap ─────────────────────────────────────────────────────────────
const DEFAULT_SERVICES: Array<{
  name: string;
  category: string;
  defaultPrice: number;
  taxRate: number;
  keywords: string;
}> = [
  { name: "Aadhaar Update", category: "Govt Services", defaultPrice: 100, taxRate: 0, keywords: "aadhaar uidai" },
  { name: "PAN Application", category: "Govt Services", defaultPrice: 120, taxRate: 18, keywords: "pan income tax" },
  { name: "Voter ID", category: "Govt Services", defaultPrice: 80, taxRate: 0, keywords: "voter epic" },
  { name: "Xerox / Print (B&W)", category: "Miscellaneous", defaultPrice: 2, taxRate: 0, keywords: "xerox photocopy print" },
  { name: "Form Filling", category: "Miscellaneous", defaultPrice: 50, taxRate: 18, keywords: "form application" },
  { name: "Electricity Bill Pay", category: "Utility Bills", defaultPrice: 20, taxRate: 18, keywords: "electricity bill discom" },
  { name: "Mobile/DTH Recharge", category: "Utility Bills", defaultPrice: 10, taxRate: 18, keywords: "recharge mobile dth" },
  { name: "Train Ticket Booking", category: "Travel", defaultPrice: 40, taxRate: 18, keywords: "irctc train railway" },
  { name: "Bank Passbook Print", category: "Banking & Payments", defaultPrice: 10, taxRate: 0, keywords: "bank passbook" },
];

const DEFAULT_BOOKMARKS = new Set([
  "Aadhaar Update",
  "PAN Application",
  "Xerox / Print (B&W)",
  "Form Filling",
  "Electricity Bill Pay",
  "Mobile/DTH Recharge",
  "Train Ticket Booking",
  "Bank Passbook Print",
]);

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
      category TEXT NOT NULL DEFAULT 'Other',
      default_price REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
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
  `);

  // Migration: add is_bookmarked if an older DB predates it.
  const cols = sqlite
    .prepare("PRAGMA table_info(services)")
    .all() as { name: string }[];
  if (!cols.find((c) => c.name === "is_bookmarked")) {
    sqlite.exec(
      "ALTER TABLE services ADD COLUMN is_bookmarked INTEGER NOT NULL DEFAULT 0"
    );
  }

  // Seed a single center profile row.
  const profileCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM center_profiles")
    .get() as { count: number };
  if (profileCount.count === 0) {
    db.insert(schema.centerProfiles).values({}).run();
  }

  // Seed default services if the catalog is empty.
  const serviceCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM services")
    .get() as { count: number };
  if (serviceCount.count === 0) {
    const insert = sqlite.prepare(
      `INSERT INTO services (name, category, default_price, tax_rate, is_active, is_bookmarked, keywords)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    );
    const tx = sqlite.transaction(() => {
      for (const s of DEFAULT_SERVICES) {
        insert.run(
          s.name,
          s.category,
          s.defaultPrice,
          s.taxRate,
          DEFAULT_BOOKMARKS.has(s.name) ? 1 : 0,
          s.keywords
        );
      }
    });
    tx();
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
    db.select().from(schema.customers).all()
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
      .select()
      .from(schema.customers)
      .where(
        sql`${schema.customers.name} LIKE ${pattern} OR ${schema.customers.mobile} LIKE ${pattern}`
      )
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

      return { id: invoice.id, invoiceNo, customerId, total };
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

  // Printer
  safeHandle(IPC.PRINTER_GET_CONFIG, () => printerConfig);
  safeHandle(IPC.PRINTER_SET_CONFIG, (_e, cfg) => {
    const parsed = parseArg(
      z
        .object({
          interface: z.string().optional(),
          type: z.string().optional(),
          printUpiQr: z.boolean().optional(),
        })
        .strict(),
      cfg,
      "printer:set-config"
    );
    printerConfig = { ...printerConfig, ...parsed };
    return { success: true };
  });
  safeHandle(IPC.PRINTER_LIST, () => scanForPrinters());
  safeHandle(IPC.PRINTER_TEST, async () => {
    await printTestPage(printerConfig);
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
    await printReceipt(printerConfig, invoice, center);
    db.update(schema.invoices)
      .set({ printedAt: new Date() })
      .where(eq(schema.invoices.id, id))
      .run();
    return { success: true };
  });

  // Backup
  safeHandle(IPC.BACKUP_EXPORT, () => {
    const backupDir = path.join(app.getPath("documents"), "CSC-Backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const stamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const out = path.join(backupDir, `csc_billing_${stamp}.db`);
    fs.copyFileSync(dbPath, out);
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
    closeDatabase();
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
  fs.copyFileSync(dbPath, out);
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
