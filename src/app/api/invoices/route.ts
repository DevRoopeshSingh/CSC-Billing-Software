import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateInvoiceRequest } from "@/types";

export async function POST(request: Request) {
  const body: CreateInvoiceRequest = await request.json();

  if (!body.items || body.items.length === 0) {
    return NextResponse.json(
      { error: "At least one line item is required" },
      { status: 400 }
    );
  }

  // Resolve customer – either existing or create new
  let customerId: number;
  if (body.customerId) {
    customerId = body.customerId;
  } else if (body.newCustomer) {
    const customer = await prisma.customer.create({
      data: {
        name: body.newCustomer.name,
        mobile: body.newCustomer.mobile ?? "",
      },
    });
    customerId = customer.id;
  } else {
    return NextResponse.json(
      { error: "customerId or newCustomer is required" },
      { status: 400 }
    );
  }

  // Calculate totals
  let subtotal = 0;
  let taxTotal = 0;

  for (const item of body.items) {
    const lineBase = item.qty * item.rate;
    const lineTax = lineBase * (item.taxRate / 100);
    subtotal += lineBase;
    taxTotal += lineTax;
  }

  const discount = Number(body.discount ?? 0);
  const total = subtotal + taxTotal - discount;

  try {
    // Create invoice + items in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Atomically increment the invoice counter on CenterProfile (id=1)
      const center = await tx.centerProfile.update({
        where: { id: 1 },
        data: { invoiceNumber: { increment: 1 } },
      });

      // 2. Format the human-readable invoice string e.g., "INV-0005"
      const invoiceNo = `${center.invoicePrefix}${String(center.invoiceNumber).padStart(4, "0")}`;

      // 3. Create the invoice
      const inv = await tx.invoice.create({
        data: {
          invoiceNo,
          customerId,
          subtotal,
          taxTotal,
          discount,
          total,
          paymentMode: body.paymentMode ?? "Cash",
          status: body.status ?? "PAID",
          notes: body.notes ?? null,
          customerNotes: body.customerNotes ?? null,
          items: {
            create: body.items.map((item) => ({
              serviceId: item.serviceId,
              description: item.description,
              qty: item.qty,
              rate: item.rate,
              taxRate: item.taxRate,
              lineTotal: item.qty * item.rate * (1 + item.taxRate / 100),
            })),
          },
        },
      });
      return inv;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        where.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }
    }

    if (search) {
      const idMatch = search.match(/^INV-(\d+)$/i);
      const searchNum = idMatch ? Number(idMatch[1]) : Number(search);

      where.OR = [
        { customer: { name: { contains: search } } },
        { customer: { mobile: { contains: search } } },
      ];
      if (!isNaN(searchNum)) {
        where.OR.push({ id: searchNum });
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
      },
      take: 100,
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
