// src/server/handlers/center.ts
// Pure center-profile handlers. Web slice only — printer-related fields
// (printerInterface, printerType) deliberately live outside the pg schema
// because the thermal-printer subsystem stays on Electron/IPC. The PATCH
// schema rejects them with BAD_INPUT if a client tries to slip them in.

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "../db";
import { hashPin, verifyPin } from "@/lib/pin";
import { PaymentMode } from "@/shared/types";
import { logAudit } from "./audit";

type CenterRow = typeof schema.centerProfiles.$inferSelect;

export interface CenterProfileShape {
  id: number;
  centerName: string;
  address: string;
  mobile: string;
  email: string;
  udyamNumber: string;
  logoKey: string | null;
  upiQrKey: string | null;
  upiId: string | null;
  invoicePrefix: string;
  invoiceNumber: number;
  theme: string;
  defaultTaxRate: number;
  defaultPaymentMode: string;
  lastBackupDate: Date | null;
  hasPin: boolean;
  operatingHours: string;
  centerDescription: string;
  printUpiQr: boolean;
  whatsappEnabled: boolean;
  whatsappApiToken: string | null;
  whatsappPhoneId: string | null;
  cloudBackupEnabled: boolean;
  s3Endpoint: string | null;
  s3AccessKey: string | null;
  s3SecretKey: string | null;
  s3Bucket: string | null;
  backupEncryptionKey: string | null;
  cronSecret: string | null;
}

function serializeCenter(row: CenterRow): CenterProfileShape {
  return {
    id: row.id,
    centerName: row.centerName,
    address: row.address,
    mobile: row.mobile,
    email: row.email,
    udyamNumber: row.udyamNumber,
    logoKey: row.logoKey,
    upiQrKey: row.upiQrKey,
    upiId: row.upiId,
    invoicePrefix: row.invoicePrefix,
    invoiceNumber: row.invoiceNumber,
    theme: row.theme,
    defaultTaxRate: Number(row.defaultTaxRate),
    defaultPaymentMode: row.defaultPaymentMode,
    lastBackupDate: row.lastBackupDate,
    // Never expose pinHash on the wire. `hasPin` lets the settings UI decide
    // whether to require a currentPin field on the PIN-change form.
    hasPin: !!row.pinHash,
    operatingHours: row.operatingHours,
    centerDescription: row.centerDescription,
    printUpiQr: row.printUpiQr,
    whatsappEnabled: row.whatsappEnabled,
    whatsappApiToken: row.whatsappApiToken,
    whatsappPhoneId: row.whatsappPhoneId,
    cloudBackupEnabled: row.cloudBackupEnabled,
    s3Endpoint: row.s3Endpoint,
    s3AccessKey: row.s3AccessKey,
    s3SecretKey: row.s3SecretKey,
    s3Bucket: row.s3Bucket,
    backupEncryptionKey: row.backupEncryptionKey,
    cronSecret: row.cronSecret,
  };
}

export async function getCenterProfile(): Promise<CenterProfileShape | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.centerProfiles)
    .where(eq(schema.centerProfiles.id, 1))
    .limit(1);
  return row ? serializeCenter(row) : null;
}

// Locked-down PATCH payload. pinHash, invoiceNumber, logoKey, upiQrKey,
// lastBackupDate, and id are intentionally absent — they're managed by
// dedicated endpoints (PIN, invoice numbering, branding, backup) so a
// settings save can never wipe them.
export const centerUpdateInputSchema = z
  .object({
    centerName: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    mobile: z.string().max(50).optional(),
    email: z.string().email().or(z.literal("")).optional(),
    udyamNumber: z.string().max(50).optional(),
    upiId: z.string().nullable().optional(),
    invoicePrefix: z.string().min(1).max(20).optional(),
    theme: z.string().max(20).optional(),
    defaultTaxRate: z.number().nonnegative().max(100).optional(),
    defaultPaymentMode: PaymentMode.optional(),
    operatingHours: z.string().max(200).optional(),
    centerDescription: z.string().max(500).optional(),
    printUpiQr: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
    whatsappApiToken: z.string().nullable().optional(),
    whatsappPhoneId: z.string().nullable().optional(),
    cloudBackupEnabled: z.boolean().optional(),
    s3Endpoint: z.string().nullable().optional(),
    s3AccessKey: z.string().nullable().optional(),
    s3SecretKey: z.string().nullable().optional(),
    s3Bucket: z.string().nullable().optional(),
    backupEncryptionKey: z.string().nullable().optional(),
    cronSecret: z.string().nullable().optional(),
  })
  .strict();
export type CenterUpdateInput = z.infer<typeof centerUpdateInputSchema>;

export async function updateCenterProfile(
  input: CenterUpdateInput,
  userId: number
): Promise<CenterProfileShape | null> {
  const db = getDb();
  // numeric column needs a string; everything else is straight passthrough.
  const patch: Record<string, unknown> = { ...input };
  if (input.defaultTaxRate !== undefined) {
    patch.defaultTaxRate = input.defaultTaxRate.toString();
  }
  const [row] = await db
    .update(schema.centerProfiles)
    .set(patch)
    .where(eq(schema.centerProfiles.id, 1))
    .returning();
    
  if (row) {
    await logAudit({
      userId,
      action: "UPDATE",
      entityType: "SETTINGS",
      entityId: "center_profile",
      details: Object.keys(input), // Log what fields were changed
    });
  }
  return row ? serializeCenter(row) : null;
}

// PIN set / change. If a pinHash already exists, currentPin is required and
// must verify. If none exists (first-time setup outside the initial
// /api/auth/setup flow), currentPin is optional.
export const setPinInputSchema = z.object({
  newPin: z.string().min(6).max(64),
  currentPin: z.string().optional(),
});
export type SetPinInput = z.infer<typeof setPinInputSchema>;

export async function setCenterPin(
  input: SetPinInput
): Promise<{ success: true }> {
  const db = getDb();
  const [profile] = await db
    .select({
      id: schema.centerProfiles.id,
      pinHash: schema.centerProfiles.pinHash,
    })
    .from(schema.centerProfiles)
    .where(eq(schema.centerProfiles.id, 1))
    .limit(1);

  if (!profile) {
    throw new Error("Center profile not initialised");
  }
  if (profile.pinHash) {
    if (!input.currentPin) {
      throw new Error("Current PIN is required to change the admin PIN.");
    }
    const ok = await verifyPin(input.currentPin, profile.pinHash);
    if (!ok) throw new Error("Current PIN is incorrect.");
  }
  const newHash = await hashPin(input.newPin);
  await db
    .update(schema.centerProfiles)
    .set({ pinHash: newHash })
    .where(eq(schema.centerProfiles.id, profile.id));
  return { success: true };
}
