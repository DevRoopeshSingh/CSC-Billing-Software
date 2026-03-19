import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ensure a default center profile always exists
async function ensureProfile() {
  let profile = await prisma.centerProfile.findUnique({ where: { id: 1 } });
  if (!profile) {
    profile = await prisma.centerProfile.create({
      data: { id: 1 },
    });
  }
  return profile;
}

export async function GET() {
  const profile = await ensureProfile();
  const { pinHash, ...safeProfile } = profile as any;
  return NextResponse.json({ ...safeProfile, hasPin: !!pinHash });
}

export async function PUT(request: Request) {
  await ensureProfile();
  const body = await request.json();

  const arg: any = {
    centerName: body.centerName ?? undefined,
    address: body.address ?? undefined,
    mobile: body.mobile ?? undefined,
    email: body.email ?? undefined,
    udyamNumber: body.udyamNumber ?? undefined,
  };

  if (body.logoPath !== undefined) arg.logoPath = body.logoPath;
  if (body.upiQrPath !== undefined) arg.upiQrPath = body.upiQrPath;
  if (body.invoicePrefix !== undefined) arg.invoicePrefix = body.invoicePrefix;
  if (body.invoiceNumber !== undefined) arg.invoiceNumber = Number(body.invoiceNumber);
  if (body.theme !== undefined) arg.theme = body.theme;
  if (body.defaultTaxRate !== undefined) arg.defaultTaxRate = Number(body.defaultTaxRate);
  if (body.defaultPaymentMode !== undefined) arg.defaultPaymentMode = body.defaultPaymentMode;

  const updated = await prisma.centerProfile.update({
    where: { id: 1 },
    data: arg,
  });

  const { pinHash, ...safeUpdated } = updated as any;
  return NextResponse.json({ ...safeUpdated, hasPin: !!pinHash });
}
