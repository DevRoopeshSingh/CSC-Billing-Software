// src/utils/constants.ts

export const APP_NAME = "CSC Billing Software";
export const APP_ID = "com.csc.billing";

export const DEFAULT_INVOICE_PREFIX = "INV-";
export const DEFAULT_TAX_RATE = 0;
export const DEFAULT_PAYMENT_MODE = "Cash";

export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Other"] as const;

export const INVOICE_STATUSES = ["PAID", "PENDING", "CANCELLED"] as const;

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "CONVERTED",
  "CLOSED",
] as const;

export const DATE_FORMAT = "dd/MM/yyyy";
export const DATETIME_FORMAT = "dd/MM/yyyy HH:mm";
export const CURRENCY_LOCALE = "en-IN";
export const CURRENCY = "INR";

export const MAX_BACKUP_FILES = 7;
