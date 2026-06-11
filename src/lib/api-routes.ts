// src/lib/api-routes.ts
// Typed route table for Phase 1 (auth + customers). Keep route strings out of
// component code so a path rename is one edit, not a grep-and-pray. Mirrors
// the role @/shared/ipc-channels.ts used to play.

export const API = {
  AUTH_CHECK_FIRST_RUN: "/api/auth/check-first-run",
  AUTH_SETUP: "/api/auth/setup",
  AUTH_LOGIN: "/api/auth/login",
  AUTH_LOGOUT: "/api/auth/logout",
  AUTH_SESSION: "/api/auth/session",

  CUSTOMERS: "/api/customers",
  CUSTOMERS_SEARCH: "/api/customers/search",
  CUSTOMER: (id: number) => `/api/customers/${id}`,

  SERVICES: "/api/services",
  SERVICES_BOOKMARKED: "/api/services/bookmarked",
  SERVICES_BULK_UPDATE: "/api/services/bulk-update",
  SERVICES_BULK_DELETE: "/api/services/bulk-delete",
  SERVICE: (id: number) => `/api/services/${id}`,
  SERVICE_BOOKMARK: (id: number) => `/api/services/${id}/bookmark`,
  SERVICE_CHECKLIST: (id: number) => `/api/services/${id}/checklist`,

  INVOICES: "/api/invoices",
  INVOICES_BULK_MARK_PAID: "/api/invoices/bulk-mark-paid",
  INVOICE: (id: number) => `/api/invoices/${id}`,
  INVOICE_PDF: (id: number) => `/api/invoices/${id}/pdf`,
  INVOICE_STATUS: (id: number) => `/api/invoices/${id}/status`,
  INVOICE_CANCEL: (id: number) => `/api/invoices/${id}/cancel`,

  CENTER: "/api/center",
  CENTER_PIN: "/api/center/pin",
  CENTER_BRANDING: "/api/center/branding",
  CENTER_BRANDING_ASSET: (kind: "logo" | "upiQr") =>
    `/api/center/branding/${kind}`,

  REPORTS_SUMMARY: "/api/reports/summary",
  REPORTS_PENDING_DUES: "/api/reports/pending-dues",
  REPORTS_TOP_CUSTOMERS: "/api/reports/top-customers",
  REPORTS_TOP_SERVICES: "/api/reports/top-services",
  REPORTS_OPERATOR_PERFORMANCE: "/api/reports/operator-performance",
  REPORTS_REVENUE_TRENDS: "/api/reports/revenue-trends",
  REPORTS_RANGE: "/api/reports/range",
  REPORTS_TALLY_EXPORT: "/api/reports/tally-export",
  REPORTS_UDHAR: "/api/reports/udhar",

  USERS: "/api/users",
  USER: (id: number) => `/api/users/${id}`,
  USER_PASSWORD: (id: number) => `/api/users/${id}/password`,

  AUTH_RESET_PASSWORD: "/api/auth/reset-password",

  SERVICES_IMPORT_CSV: "/api/services/import-csv",
  SERVICES_LOAD_SEED: "/api/services/load-seed",
} as const;
