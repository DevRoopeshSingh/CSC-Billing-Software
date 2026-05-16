// src/server/handlers/branding.ts
// Branding asset upload / read / delete. Bytes live in Postgres bytea via the
// brandingAssets table; the GET endpoint streams them back unmodified with
// the stored Content-Type. Multipart-only on the upload side (no base64 JSON
// path) — content negotiation is locked at one shape each direction.

import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import {
  ALLOWED_BRANDING_MIME,
  MAX_BRANDING_ASSET_BYTES,
  brandingAssetKindSchema,
  type BrandingAssetKind,
} from "@/shared/types";

export interface BrandingAssetBytes {
  mimeType: string;
  data: Buffer;
  updatedAt: Date;
}

export async function getBrandingAsset(
  kind: string
): Promise<BrandingAssetBytes | null> {
  const parsed = brandingAssetKindSchema.safeParse(kind);
  if (!parsed.success) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.brandingAssets)
    .where(eq(schema.brandingAssets.kind, parsed.data))
    .limit(1);
  if (!row) return null;
  return {
    mimeType: row.mimeType,
    data: row.data,
    updatedAt: row.updatedAt,
  };
}

export interface UploadBrandingResult {
  kind: BrandingAssetKind;
  mimeType: string;
  size: number;
  updatedAt: Date;
}

// Multipart upload entrypoint. Expects the route handler to have already
// pulled `kind` and `file` out of req.formData(). Validates kind/MIME/size
// here so the same checks run regardless of which route called us.
export async function uploadBrandingAsset(args: {
  kind: string;
  mimeType: string;
  data: Buffer;
}): Promise<UploadBrandingResult> {
  const kindParsed = brandingAssetKindSchema.safeParse(args.kind);
  if (!kindParsed.success) {
    throw new Error("kind must be 'logo' or 'upiQr'");
  }
  if (
    !ALLOWED_BRANDING_MIME.includes(
      args.mimeType as (typeof ALLOWED_BRANDING_MIME)[number]
    )
  ) {
    throw new Error("Only image/png and image/jpeg are allowed.");
  }
  if (args.data.byteLength === 0) {
    throw new Error("File is empty.");
  }
  if (args.data.byteLength > MAX_BRANDING_ASSET_BYTES) {
    throw new Error(
      `File exceeds the ${Math.round(
        MAX_BRANDING_ASSET_BYTES / 1024 / 1024
      )} MB limit.`
    );
  }

  const db = getDb();
  // Upsert keyed on kind. .onConflictDoUpdate is the idiomatic drizzle-pg
  // way; the trailing updated_at refresh comes from a manual set rather than
  // a default-on-update, which postgres-js handles without extra round-trips.
  const [row] = await db
    .insert(schema.brandingAssets)
    .values({
      kind: kindParsed.data,
      mimeType: args.mimeType,
      data: args.data,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.brandingAssets.kind,
      set: {
        mimeType: args.mimeType,
        data: args.data,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    kind: row.kind as BrandingAssetKind,
    mimeType: row.mimeType,
    size: row.data.byteLength,
    updatedAt: row.updatedAt,
  };
}

export async function deleteBrandingAsset(
  kind: string
): Promise<{ success: true }> {
  const parsed = brandingAssetKindSchema.safeParse(kind);
  if (!parsed.success) {
    throw new Error("kind must be 'logo' or 'upiQr'");
  }
  const db = getDb();
  await db
    .delete(schema.brandingAssets)
    .where(eq(schema.brandingAssets.kind, parsed.data));
  return { success: true };
}
