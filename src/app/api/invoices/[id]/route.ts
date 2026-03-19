import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          service: true,
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const { items, discount, paymentMode, notes, customerNotes } = body;

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.qty * item.rate, 0);
    const taxTotal = items.reduce(
      (sum: number, item: any) => sum + item.qty * item.rate * (item.taxRate / 100),
      0
    );
    const total = subtotal + taxTotal - (discount || 0);

    const invoice = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      // Create new items and update invoice
      return tx.invoice.update({
        where: { id },
        data: {
          discount,
          paymentMode,
          notes,
          customerNotes,
          subtotal,
          taxTotal,
          total,
          items: {
            create: items.map((item: any) => {
              const lineBase = item.qty * item.rate;
              const lineTax = lineBase * (item.taxRate / 100);
              return {
                serviceId: item.serviceId,
                description: item.description,
                qty: item.qty,
                rate: item.rate,
                taxRate: item.taxRate,
                lineTotal: lineBase + lineTax,
              };
            }),
          },
        },
      });
    });

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice." }, { status: 500 });
  }
}
