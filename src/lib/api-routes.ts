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
} as const;
