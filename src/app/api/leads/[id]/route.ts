import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const data: any = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.mobile !== undefined) data.mobile = body.mobile;
    if (body.email !== undefined) data.email = body.email;
    if (body.serviceInterest !== undefined) data.serviceInterest = body.serviceInterest;
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.convertedCustomerId !== undefined) data.convertedCustomerId = body.convertedCustomerId;

    const lead = await prisma.lead.update({ where: { id }, data });
    return NextResponse.json({ data: lead });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    console.error("Failed to update lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    console.error("Failed to delete lead:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
