// src/main/index.ts
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import { spawn, ChildProcess } from "child_process";
import { autoUpdater } from "electron-updater";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { initDatabase, getDb, getSqlite, closeDatabase } from "../db";
import * as schema from "../db/schema";
import { IPC } from "../shared/ipc-channels";

// ── Paths ────────────────────────────────────────────────────────────────────
const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "csc_billing.db");
const uploadsPath = path.join(userDataPath, "uploads");

process.env.DATABASE_URL = `file:${dbPath}`;
process.env.USER_DATA_PATH = userDataPath;

let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;

// ── Safe IPC wrapper ─────────────────────────────────────────────────────────
function safeHandle(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any
) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (err) {
      console.error(`[IPC ${channel}]`, err);
      return { error: String(err) };
    }
  });
}

// ── Printer config (in-memory) ───────────────────────────────────────────────
let printerConfig = {
  interface: "tcp://192.168.1.100:9100",
  type: "EPSON",
  printUpiQr: false,
};

// ── Database Bootstrap ───────────────────────────────────────────────────────
function bootstrapDatabase() {
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  const db = initDatabase(dbPath);

  // Create tables if they don't exist (Drizzle push equivalent at runtime)
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
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      default_price REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
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
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
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

    CREATE TABLE IF NOT EXISTS agent_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL,
      session_id TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_name TEXT NOT NULL DEFAULT '',
      tool_input TEXT NOT NULL DEFAULT '',
      duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'copilot',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER
    );
  `);

  // Seed default center profile if empty
  const profileCount = sqlite
    .prepare("SELECT COUNT(*) as count FROM center_profiles")
    .get() as { count: number };
  if (profileCount.count === 0) {
    db.insert(schema.centerProfiles).values({}).run();
  }

  return db;
}

// ── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../electron/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "../public/icon.svg"),
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    const nextPath = path.join(
      __dirname,
      "../node_modules/next/dist/bin/next"
    );

    nextProcess = spawn("node", [nextPath, "start", "-p", "3000"], {
      env: {
        ...process.env,
        PORT: "3000",
        DATABASE_URL: `file:${dbPath}`,
        USER_DATA_PATH: userDataPath,
      },
    });

    nextProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      console.log(`Next Server: ${output}`);
      if (
        output.includes("ready") ||
        output.includes("started server on")
      ) {
        mainWindow?.loadURL("http://localhost:3000");
      }
    });

    nextProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`Next Error: ${data}`);
    });

    setTimeout(() => {
      if (mainWindow?.webContents.getURL() === "") {
        mainWindow.loadURL("http://localhost:3000");
      }
    }, 6000);
  }

  autoUpdater.checkForUpdatesAndNotify().catch((e) => console.error(e));
}

// ── Register IPC Handlers ────────────────────────────────────────────────────
function registerIpcHandlers() {
  const db = getDb();

  // ── App ────────────────────────────────────────────────────────────────
  safeHandle(IPC.APP_VERSION, () => app.getVersion());
  safeHandle(IPC.APP_DB_PATH, () => dbPath);

  // ── Center Profile ─────────────────────────────────────────────────────
  safeHandle(IPC.CENTER_GET, () => {
    return db.select().from(schema.centerProfiles).get();
  });

  safeHandle(IPC.CENTER_UPDATE, (_e, data: Partial<typeof schema.centerProfiles.$inferInsert>) => {
    return db
      .update(schema.centerProfiles)
      .set(data)
      .where(eq(schema.centerProfiles.id, 1))
      .run();
  });

  // ── Customers ──────────────────────────────────────────────────────────
  safeHandle(IPC.CUSTOMERS_LIST, () => {
    return db.select().from(schema.customers).all();
  });

  safeHandle(IPC.CUSTOMERS_GET, (_e, id: number) => {
    return db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, id))
      .get();
  });

  safeHandle(IPC.CUSTOMERS_CREATE, (_e, data: typeof schema.customers.$inferInsert) => {
    return db.insert(schema.customers).values(data).returning().get();
  });

  safeHandle(IPC.CUSTOMERS_UPDATE, (_e, id: number, data: Partial<typeof schema.customers.$inferInsert>) => {
    return db
      .update(schema.customers)
      .set(data)
      .where(eq(schema.customers.id, id))
      .returning()
      .get();
  });

  safeHandle(IPC.CUSTOMERS_DELETE, (_e, id: number) => {
    return db
      .delete(schema.customers)
      .where(eq(schema.customers.id, id))
      .run();
  });

  safeHandle(IPC.CUSTOMERS_SEARCH, (_e, query: string) => {
    const pattern = `%${query}%`;
    return db
      .select()
      .from(schema.customers)
      .where(
        sql`${schema.customers.name} LIKE ${pattern} OR ${schema.customers.mobile} LIKE ${pattern}`
      )
      .all();
  });

  // ── Services ───────────────────────────────────────────────────────────
  safeHandle(IPC.SERVICES_LIST, () => {
    return db.select().from(schema.services).all();
  });

  safeHandle(IPC.SERVICES_GET, (_e, id: number) => {
    return db
      .select()
      .from(schema.services)
      .where(eq(schema.services.id, id))
      .get();
  });

  safeHandle(IPC.SERVICES_CREATE, (_e, data: typeof schema.services.$inferInsert) => {
    return db.insert(schema.services).values(data).returning().get();
  });

  safeHandle(IPC.SERVICES_UPDATE, (_e, id: number, data: Partial<typeof schema.services.$inferInsert>) => {
    return db
      .update(schema.services)
      .set(data)
      .where(eq(schema.services.id, id))
      .returning()
      .get();
  });

  safeHandle(IPC.SERVICES_DELETE, (_e, id: number) => {
    return db
      .delete(schema.services)
      .where(eq(schema.services.id, id))
      .run();
  });

  // ── Invoices ───────────────────────────────────────────────────────────
  safeHandle(IPC.INVOICES_LIST, () => {
    return db.query.invoices.findMany({
      with: { customer: true, items: true },
      orderBy: [desc(schema.invoices.createdAt)],
    });
  });

  safeHandle(IPC.INVOICES_GET, (_e, id: number) => {
    return db.query.invoices.findFirst({
      where: eq(schema.invoices.id, id),
      with: {
        customer: true,
        items: { with: { service: true } },
      },
    });
  });

  safeHandle(IPC.INVOICES_CREATE, (_e, data: {
    customerId: number;
    invoiceNo: string;
    subtotal: number;
    taxTotal: number;
    discount: number;
    total: number;
    paymentMode: string;
    status: string;
    notes?: string;
    customerNotes?: string;
    items: Array<{
      serviceId: number;
      description: string;
      qty: number;
      rate: number;
      taxRate: number;
      lineTotal: number;
    }>;
  }) => {
    const sqlite = getSqlite();
    const transaction = sqlite.transaction(() => {
      const invoice = db
        .insert(schema.invoices)
        .values({
          customerId: data.customerId,
          invoiceNo: data.invoiceNo,
          subtotal: data.subtotal,
          taxTotal: data.taxTotal,
          discount: data.discount,
          total: data.total,
          paymentMode: data.paymentMode,
          status: data.status,
          notes: data.notes,
          customerNotes: data.customerNotes,
        })
        .returning()
        .get();

      const items = data.items.map((item) =>
        db
          .insert(schema.invoiceItems)
          .values({ ...item, invoiceId: invoice.id })
          .returning()
          .get()
      );

      return { ...invoice, items };
    });

    return transaction();
  });

  safeHandle(IPC.INVOICES_UPDATE_STATUS, (_e, id: number, status: string) => {
    return db
      .update(schema.invoices)
      .set({ status })
      .where(eq(schema.invoices.id, id))
      .returning()
      .get();
  });

  safeHandle(IPC.INVOICES_DELETE, (_e, id: number) => {
    const sqlite = getSqlite();
    const transaction = sqlite.transaction(() => {
      db.delete(schema.invoiceItems)
        .where(eq(schema.invoiceItems.invoiceId, id))
        .run();
      db.delete(schema.invoices)
        .where(eq(schema.invoices.id, id))
        .run();
    });
    return transaction();
  });

  safeHandle(IPC.INVOICES_GENERATE_PDF, () => {
    return { error: "not implemented yet" };
  });

  // ── Reports ────────────────────────────────────────────────────────────
  safeHandle(IPC.REPORTS_DAILY, (_e, dateStr: string) => {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    return db.query.invoices.findMany({
      where: and(
        gte(schema.invoices.createdAt, start),
        lte(schema.invoices.createdAt, end)
      ),
      with: { customer: true, items: true },
    });
  });

  safeHandle(IPC.REPORTS_RANGE, (_e, startStr: string, endStr: string) => {
    const start = new Date(startStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endStr);
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

  // ── Printer ────────────────────────────────────────────────────────────
  safeHandle(IPC.PRINTER_GET_CONFIG, () => {
    return printerConfig;
  });

  safeHandle(IPC.PRINTER_SET_CONFIG, (_e, config: Partial<typeof printerConfig>) => {
    printerConfig = { ...printerConfig, ...config };
    return { success: true };
  });

  safeHandle(IPC.PRINTER_LIST, () => {
    return { error: "not implemented yet" };
  });

  safeHandle(IPC.PRINTER_TEST, (_e, config?: Partial<typeof printerConfig>) => {
    if (config) printerConfig = { ...printerConfig, ...config };
    return { error: "not implemented yet" };
  });

  safeHandle(IPC.PRINTER_PRINT_RECEIPT, (_e, _invoice: unknown) => {
    return { error: "not implemented yet" };
  });

  // ── Backup ─────────────────────────────────────────────────────────────
  safeHandle(IPC.BACKUP_EXPORT, () => {
    const backupDir = path.join(
      app.getPath("documents"),
      "CSC-Backups"
    );
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const backupFile = path.join(
      backupDir,
      `csc_billing_${timestamp}.db`
    );

    fs.copyFileSync(dbPath, backupFile);
    return { success: true, path: backupFile };
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

    const importPath = result.filePaths[0];
    closeDatabase();
    fs.copyFileSync(importPath, dbPath);
    initDatabase(dbPath);
    return { success: true, path: importPath };
  });
}

// ── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  bootstrapDatabase();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  closeDatabase();
  if (nextProcess) {
    nextProcess.kill();
  }
});
