import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("active");

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { keywords: { contains: search } },
    ];
  }
  if (category) where.category = category;
  if (activeOnly === "true") where.isActive = true;

  const services = await prisma.service.findMany({
    where,
    orderBy: { id: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Service name is required" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      name: body.name,
      category: body.category || "Other",
      defaultPrice: Number(body.defaultPrice ?? 0),
      taxRate: Number(body.taxRate ?? 0),
      isActive: body.isActive !== false,
    },
  });

  return NextResponse.json(service, { status: 201 });
}
