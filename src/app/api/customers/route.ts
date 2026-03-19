import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? "";

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { mobile: { contains: search } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    take: 20,
  });

  return NextResponse.json(customers);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      mobile: body.mobile ?? "",
      remarks: body.remarks ?? null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
