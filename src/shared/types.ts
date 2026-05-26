// src/shared/types.ts
import { z } from "zod";
import { SERVICE_CATEGORIES } from "../config/categories";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const PaymentMode = z.enum(["Cash", "UPI", "Card", "Other"]);
export type PaymentMode = z.infer<typeof PaymentMode>;

export const InvoiceStatus = z.enum(["PAID", "PENDING", "CANCELLED"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

export const LeadStatus = z.enum(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const MessageChannel = z.enum(["whatsapp", "sms", "both"]);
export type MessageChannel = z.infer<typeof MessageChannel>;

export const UserRole = z.enum(["admin", "staff", "viewer"]);
export type UserRole = z.infer<typeof UserRole>;

// ─── Users ───────────────────────────────────────────────────────────────────
export const userSchema = z.object({
  id: z.number().int().positive().optional(),
  username: z.string().min(3),
  email: z.string().email().or(z.literal("")).nullable().default(null),
  role: UserRole.default("viewer"),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date().optional(),
});

export type User = z.infer<typeof userSchema>;

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const setupRequestSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  adminPin: z.string().min(6),
});
export type SetupRequest = z.infer<typeof setupRequestSchema>;

// Strict update payload for USERS_UPDATE: only these fields may be changed by
// an admin. Username, passwordHash, createdAt, id are intentionally omitted.
export const userUpdateSchema = z.object({
  email: z.string().email().or(z.literal("")).nullable().optional(),
  role: UserRole.optional(),
  isActive: z.boolean().optional(),
});
export type UserUpdateRequest = z.infer<typeof userUpdateSchema>;

export const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().or(z.literal("")).nullable().optional(),
  role: UserRole,
  isActive: z.boolean().default(true),
  password: z.string().min(6),
});
export type CreateUserRequest = z.infer<typeof createUserSchema>;

export const setPinSchema = z.object({
  newPin: z.string().min(6),
  currentPin: z.string().optional(),
});
export type SetPinRequest = z.infer<typeof setPinSchema>;

export const changePasswordSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(6),
  oldPassword: z.string().optional(),
});
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

// Password reset using the global admin PIN as the authorization factor.
// No session required (the user is by definition locked out). Rate-limited
// in the handler.
export const resetPasswordByPinSchema = z.object({
  username: z.string().min(1),
  adminPin: z.string().min(4),
  newPassword: z.string().min(6),
});
export type ResetPasswordByPinRequest = z.infer<typeof resetPasswordByPinSchema>;

// ─── Center Profile ──────────────────────────────────────────────────────────
export const centerProfileSchema = z.object({
  id: z.number().int().positive().optional(),
  centerName: z.string().default(""),
  address: z.string().default(""),
  mobile: z.string().default(""),
  email: z.string().email().or(z.literal("")).default(""),
  udyamNumber: z.string().default(""),
  logoPath: z.string().nullable().default(null),
  upiQrPath: z.string().nullable().default(null),
  upiId: z.string().nullable().default(null),
  invoicePrefix: z.string().default("INV-"),
  invoiceNumber: z.number().int().nonnegative().default(0),
  theme: z.string().default("light"),
  defaultTaxRate: z.number().nonnegative().default(0),
  defaultPaymentMode: PaymentMode.default("Cash"),
  lastBackupDate: z.coerce.date().nullable().default(null),
  pinHash: z.string().nullable().default(null),
  operatingHours: z.string().default(""),
  centerDescription: z.string().default(""),
  printerInterface: z.string().default("tcp://192.168.1.100:9100"),
  printerType: z.string().default("EPSON"),
  printUpiQr: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
  whatsappApiToken: z.string().nullable().default(null),
  whatsappPhoneId: z.string().nullable().default(null),
  cloudBackupEnabled: z.boolean().default(false),
  s3Endpoint: z.string().nullable().default(null),
  s3AccessKey: z.string().nullable().default(null),
  s3SecretKey: z.string().nullable().default(null),
  s3Bucket: z.string().nullable().default(null),
  backupEncryptionKey: z.string().nullable().default(null),
  cronSecret: z.string().nullable().default(null),
  smsEnabled: z.boolean().default(false),
  smsProvider: z.string().default("fast2sms"),
  smsApiToken: z.string().nullable().default(null),
  smsSenderId: z.string().nullable().default(null),
  smsTemplateId: z.string().nullable().default(null),
});

export type CenterProfile = z.infer<typeof centerProfileSchema>;

// Locked-down payload accepted by CENTER_UPDATE. `pinHash`, `invoiceNumber`,
// `logoPath`, `upiQrPath`, and `id` are deliberately removed: a renderer must
// not be able to wipe the admin PIN, reset the invoice counter, change the
// row id, or repoint branding paths to arbitrary disk locations via this
// endpoint. PIN changes go through AUTH_SET_PIN; logos/QR through
// CENTER_UPLOAD_BRANDING.
export const centerProfileUpdateSchema = centerProfileSchema
  .omit({
    id: true,
    pinHash: true,
    invoiceNumber: true,
    logoPath: true,
    upiQrPath: true,
  })
  .partial();
export type CenterProfileUpdate = z.infer<typeof centerProfileUpdateSchema>;

export const brandingAssetKindSchema = z.enum(["logo", "upiQr"]);
export type BrandingAssetKind = z.infer<typeof brandingAssetKindSchema>;

// Upload payload travels over IPC as a Uint8Array (electron clones it as a
// Buffer in the main process). Limit: 2 MB — enough for QR/logo PNGs, small
// enough that a malicious renderer cannot DoS by streaming a giant blob.
export const MAX_BRANDING_ASSET_BYTES = 2 * 1024 * 1024;
export const ALLOWED_BRANDING_MIME = ["image/png", "image/jpeg"] as const;

export const uploadBrandingSchema = z.object({
  kind: brandingAssetKindSchema,
  mimeType: z.enum(ALLOWED_BRANDING_MIME),
  data: z.instanceof(Uint8Array).refine(
    (b) => b.byteLength > 0 && b.byteLength <= MAX_BRANDING_ASSET_BYTES,
    `data must be 1..${MAX_BRANDING_ASSET_BYTES} bytes`
  ),
});
export type UploadBrandingRequest = z.infer<typeof uploadBrandingSchema>;

// ─── Service ─────────────────────────────────────────────────────────────────
export const ServiceCategoryEnum = z.enum(
  SERVICE_CATEGORIES as unknown as [string, ...string[]]
);

export const serviceSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, "Service name is required"),
  category: ServiceCategoryEnum.default("Other Services"),
  subcategory: z.string().default(""),
  defaultPrice: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().max(100).default(0),
  priceIsStartingFrom: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  notes: z.string().default(""),
  isActive: z.boolean().default(true),
  isBookmarked: z.boolean().default(false),
  keywords: z.string().default(""),
  createdBy: z.number().int().positive().nullable().optional(),
  updatedBy: z.number().int().positive().nullable().optional(),
});

export type Service = z.infer<typeof serviceSchema>;

// ─── Service catalogue CSV import ────────────────────────────────────────────
export const servicesImportSchema = z.object({
  csv: z.string().min(1),
  mode: z.enum(["preview", "commit"]),
});

export type ServicesImportRequest = z.infer<typeof servicesImportSchema>;

export interface ServicesImportSeedRow {
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

export interface ServicesImportResult {
  added: ServicesImportSeedRow[];
  updated: { before: Service; after: ServicesImportSeedRow }[];
  unchanged: number;
  skipped: { row: number; reason: string }[];
  totals: { rowsRead: number; willAdd: number; willUpdate: number };
  committed: boolean;
}

export const customerSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, "Customer name is required"),
  mobile: z.string().default(""),
  remarks: z.string().nullable().default(null),
  email: z.string().email().or(z.literal("")).default(""),
  address: z.string().default(""),
  tags: z.string().default(""),
  whatsappOptIn: z.boolean().default(true),
  smsOptIn: z.boolean().default(true),
  loyaltyPoints: z.number().int().default(0),
  aadhaarNumber: z.string().default(""),
  panNumber: z.string().default(""),
  kycVerified: z.boolean().default(false),
  createdBy: z.number().int().positive().nullable().optional(),
  updatedBy: z.number().int().positive().nullable().optional(),
});

export const paymentSchema = z.object({
  id: z.number().int().positive().optional(),
  invoiceId: z.number().int().positive(),
  amount: z.number().positive(),
  paymentMode: PaymentMode.default("Cash"),
  paymentDate: z.coerce.date().optional(),
  referenceId: z.string().nullable().default(null),
  createdBy: z.number().int().positive().nullable().optional(),
});
export type Payment = z.infer<typeof paymentSchema>;

export type Customer = z.infer<typeof customerSchema> & {
  invoiceCount?: number;
  totalBilled?: number;
};

// ─── Invoice Item ────────────────────────────────────────────────────────────
export const invoiceItemSchema = z.object({
  id: z.number().int().positive().optional(),
  invoiceId: z.number().int().positive().optional(),
  serviceId: z.number().int().positive(),
  description: z.string().min(1),
  qty: z.number().int().positive(),
  rate: z.number().nonnegative(),
  govCharge: z.number().nonnegative().default(0),
  taxRate: z.number().nonnegative().max(100).default(0),
  lineTotal: z.number().nonnegative(),
});

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;

// ─── Invoice ─────────────────────────────────────────────────────────────────
export const invoiceSchema = z.object({
  id: z.number().int().positive().optional(),
  invoiceNo: z.string(),
  createdAt: z.coerce.date().optional(),
  customerId: z.number().int().positive(),
  subtotal: z.number().nonnegative(),
  taxTotal: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  advancePayment: z.number().nonnegative().default(0),
  balanceAmount: z.number().nonnegative().default(0),
  paymentMode: PaymentMode.default("Cash"),
  status: InvoiceStatus.default("PAID"),
  notes: z.string().nullable().default(null),
  customerNotes: z.string().nullable().default(null),
  printedAt: z.coerce.date().nullable().default(null),
  items: z.array(invoiceItemSchema).optional(),
  createdBy: z.number().int().positive().nullable().optional(),
  updatedBy: z.number().int().positive().nullable().optional(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

// ─── Invoice with relations (read model) ─────────────────────────────────────
export type InvoiceDetail = Invoice & {
  customer: Customer;
  items: (InvoiceItem & { service: Service })[];
  payments?: Payment[];
};

// ─── Create Invoice Request ──────────────────────────────────────────────────
export const createInvoiceSchema = z.object({
  customerId: z.number().int().positive().optional(),
  newCustomer: z
    .object({
      name: z.string().min(1),
      mobile: z.string(),
    })
    .optional(),
  items: z.array(
    z.object({
      serviceId: z.number().int().positive(),
      description: z.string().min(1),
      qty: z.number().int().positive(),
      rate: z.number().nonnegative(),
      govCharge: z.number().nonnegative().default(0),
      taxRate: z.number().nonnegative().max(100).default(0),
    })
  ),
  discount: z.number().nonnegative().default(0),
  paymentMode: PaymentMode.optional(),
  status: InvoiceStatus.optional(),
  notes: z.string().optional(),
  customerNotes: z.string().optional(),
  pointsRedeemed: z.number().int().nonnegative().optional(),
  advancePayment: z.number().nonnegative().default(0).optional(),
  sendWhatsApp: z.boolean().default(false).optional(),
  sendSms: z.boolean().default(false).optional(),
});

export type CreateInvoiceRequest = z.infer<typeof createInvoiceSchema>;

// ─── FAQ Entry ───────────────────────────────────────────────────────────────
export const faqEntrySchema = z.object({
  id: z.number().int().positive().optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().default("General"),
  tags: z.string().default(""),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  createdBy: z.number().int().positive().nullable().optional(),
  updatedBy: z.number().int().positive().nullable().optional(),
});

export type FaqEntry = z.infer<typeof faqEntrySchema>;

// ─── Service Checklist ───────────────────────────────────────────────────────
export const serviceChecklistSchema = z.object({
  id: z.number().int().positive().optional(),
  serviceId: z.number().int().positive(),
  documentName: z.string().min(1),
  isRequired: z.boolean().default(true),
  notes: z.string().default(""),
  sortOrder: z.number().int().nonnegative().default(0),
});

export type ServiceChecklistItem = z.infer<typeof serviceChecklistSchema>;

// Replace-all upsert for a service's checklist. Items without an id are
// inserted; items with an id existing in the DB are updated; existing rows
// not present in the payload are deleted. All in one transaction.
export const checklistUpsertBulkSchema = z.object({
  serviceId: z.number().int().positive(),
  items: z.array(
    z.object({
      id: z.number().int().positive().optional(),
      documentName: z.string().min(1),
      isRequired: z.boolean().default(true),
      notes: z.string().default(""),
      sortOrder: z.number().int().nonnegative().default(0),
    })
  ),
});

export type ChecklistUpsertBulkRequest = z.infer<
  typeof checklistUpsertBulkSchema
>;

// ─── Bulk service updates ────────────────────────────────────────────────────
export const bulkUpdateServicesSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  patch: z
    .object({
      isActive: z.boolean().optional(),
      isBookmarked: z.boolean().optional(),
    })
    .refine(
      (p) => p.isActive !== undefined || p.isBookmarked !== undefined,
      "patch must set at least one field"
    ),
});

export type BulkUpdateServicesRequest = z.infer<
  typeof bulkUpdateServicesSchema
>;

export const bulkDeleteServicesSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
});

export type BulkDeleteServicesRequest = z.infer<
  typeof bulkDeleteServicesSchema
>;

export interface BulkDeleteServicesResult {
  deleted: number;
  skippedInUse: number[];
}

// ─── Bulk mark invoices as paid ──────────────────────────────────────────────
export const bulkMarkPaidSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Other"]).default("Cash"),
});
export type BulkMarkPaidRequest = z.infer<typeof bulkMarkPaidSchema>;
export interface BulkMarkPaidResult {
  updated: number;
}

// ─── Lead ────────────────────────────────────────────────────────────────────
export const leadCreateSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().default(""),
  email: z.string().email().or(z.literal("")).default(""),
  serviceInterest: z.string().default(""),
  source: z.string().default("manual"),
  notes: z.string().nullable().default(null),
});
export type LeadCreateRequest = z.infer<typeof leadCreateSchema>;

export const leadUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  mobile: z.string().optional(),
  email: z.string().email().or(z.literal("")).optional(),
  serviceInterest: z.string().optional(),
  source: z.string().optional(),
  status: LeadStatus.optional(),
  notes: z.string().nullable().optional(),
});
export type LeadUpdateRequest = z.infer<typeof leadUpdateSchema>;

export const leadSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1),
  mobile: z.string().default(""),
  email: z.string().email().or(z.literal("")).default(""),
  serviceInterest: z.string().default(""),
  source: z.string().default("manual"),
  status: LeadStatus.default("NEW"),
  notes: z.string().nullable().default(null),
  createdAt: z.coerce.date().optional(),
  convertedCustomerId: z.number().int().positive().nullable().default(null),
  createdBy: z.number().int().positive().nullable().optional(),
  updatedBy: z.number().int().positive().nullable().optional(),
});

export type Lead = z.infer<typeof leadSchema>;

// ─── Message Template ────────────────────────────────────────────────────────
export const messageTemplateSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1),
  channel: MessageChannel.default("whatsapp"),
  body: z.string().min(1),
  isActive: z.boolean().default(true),
});

export type MessageTemplate = z.infer<typeof messageTemplateSchema>;
