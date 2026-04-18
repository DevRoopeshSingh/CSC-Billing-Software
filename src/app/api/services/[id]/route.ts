import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  const body = await request.json();

  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        category: body.category ?? undefined,
        defaultPrice: body.defaultPrice !== undefined ? Number(body.defaultPrice) : undefined,
        taxRate: body.taxRate !== undefined ? Number(body.taxRate) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        keywords: body.keywords ?? undefined,
      },
    });
    return NextResponse.json(service);
  } catch {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  try {
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }
}
