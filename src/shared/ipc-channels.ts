// src/shared/ipc-channels.ts
// Single source of truth for all IPC channel names.
// Import in both main process and preload script to avoid typos.

export const IPC = {
  // ── App ──────────────────────────────────────────────────────────────────
  APP_VERSION: "app:version",
  APP_DB_PATH: "app:db-path",

  // ── Center Profile ───────────────────────────────────────────────────────
  CENTER_GET: "center:get",
  CENTER_UPDATE: "center:update",
  CENTER_UPLOAD_BRANDING: "center:upload-branding",
  CENTER_DELETE_BRANDING: "center:delete-branding",
  CENTER_GET_BRANDING_ASSET: "center:get-branding-asset",

  // ── Auth & Users ─────────────────────────────────────────────────────────
  USERS_CHECK_FIRST_RUN: "users:check-first-run",
  USERS_SETUP_ADMIN: "users:setup-admin",
  USERS_LOGIN: "users:login",
  USERS_LOGOUT: "users:logout",
  USERS_RESUME_SESSION: "users:resume-session",
  USERS_LIST: "users:list",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_CHANGE_PASSWORD: "users:change-password",
  USERS_RESET_PASSWORD_BY_PIN: "users:reset-password-by-pin",
  AUTH_SET_PIN: "auth:set-pin",

  // ── Customers ────────────────────────────────────────────────────────────
  CUSTOMERS_LIST: "customers:list",
  CUSTOMERS_GET: "customers:get",
  CUSTOMERS_CREATE: "customers:create",
  CUSTOMERS_UPDATE: "customers:update",
  CUSTOMERS_DELETE: "customers:delete",
  CUSTOMERS_SEARCH: "customers:search",

  // ── Services ─────────────────────────────────────────────────────────────
  SERVICES_LIST: "services:list",
  SERVICES_GET: "services:get",
  SERVICES_CREATE: "services:create",
  SERVICES_UPDATE: "services:update",
  SERVICES_DELETE: "services:delete",
  SERVICES_TOGGLE_BOOKMARK: "services:toggle-bookmark",
  SERVICES_GET_BOOKMARKED: "services:get-bookmarked",
  SERVICES_IMPORT_CSV: "services:import-csv",
  SERVICES_LOAD_SEED_CATALOGUE: "services:load-seed-catalogue",
  SERVICES_BULK_UPDATE: "services:bulk-update",
  SERVICES_BULK_DELETE: "services:bulk-delete",
  SERVICE_CHECKLIST_LIST: "service-checklist:list",
  SERVICE_CHECKLIST_UPSERT_BULK: "service-checklist:upsert-bulk",

  // ── Invoices ─────────────────────────────────────────────────────────────
  INVOICES_LIST: "invoices:list",
  INVOICES_GET: "invoices:get",
  INVOICES_CREATE: "invoices:create",
  INVOICES_UPDATE: "invoices:update",
  INVOICES_UPDATE_STATUS: "invoices:update-status",
  INVOICES_BULK_MARK_PAID: "invoices:bulk-mark-paid",
  INVOICES_DELETE: "invoices:delete",
  INVOICES_GENERATE_PDF: "invoices:generate-pdf",
  INVOICES_PREVIEW_PDF: "invoices:preview-pdf",

  // ── Printer ──────────────────────────────────────────────────────────────
  PRINTER_PRINT_RECEIPT: "printer:print-receipt",
  PRINTER_TEST: "printer:test",
  PRINTER_LIST: "printer:list",
  PRINTER_GET_CONFIG: "printer:get-config",
  PRINTER_SET_CONFIG: "printer:set-config",

  // ── Backup ───────────────────────────────────────────────────────────────
  BACKUP_EXPORT: "backup:export",
  BACKUP_IMPORT: "backup:import",

  // ── Reports ──────────────────────────────────────────────────────────────
  REPORTS_DAILY: "reports:daily",
  REPORTS_RANGE: "reports:range",
  REPORTS_SUMMARY: "reports:summary",
  REPORTS_TOP_CUSTOMERS: "reports:top-customers",
  REPORTS_TOP_SERVICES: "reports:top-services",
  REPORTS_PENDING_DUES: "reports:pending-dues",

  // ── Leads ─────────────────────────────────────────────────────────────────
  LEADS_LIST: "leads:list",
  LEADS_GET: "leads:get",
  LEADS_CREATE: "leads:create",
  LEADS_UPDATE: "leads:update",
  LEADS_DELETE: "leads:delete",
  LEADS_CONVERT: "leads:convert",

  // ── Message Templates ─────────────────────────────────────────────────────
  MESSAGE_TEMPLATES_LIST: "message-templates:list",
  MESSAGE_TEMPLATES_UPSERT: "message-templates:upsert",
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
