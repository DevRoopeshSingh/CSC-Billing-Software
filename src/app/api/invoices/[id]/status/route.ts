import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
    }

    const body = await request.json();
    
    if (!["PAID", "PENDING", "CANCELLED"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    return NextResponse.json({ error: "Failed to update invoice status" }, { status: 500 });
  }
}
