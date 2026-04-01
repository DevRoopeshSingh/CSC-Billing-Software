import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (lead.status === "CONVERTED") {
      return NextResponse.json({ error: "Lead is already converted" }, { status: 400 });
    }

    // Create customer from lead data and update lead status
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: lead.name,
          mobile: lead.mobile,
          email: lead.email,
          remarks: `Converted from lead #${lead.id}`,
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id },
        data: {
          status: "CONVERTED",
          convertedCustomerId: customer.id,
        },
      });

      return { lead: updatedLead, customer };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Failed to convert lead:", error);
    return NextResponse.json({ error: "Failed to convert lead" }, { status: 500 });
  }
}
