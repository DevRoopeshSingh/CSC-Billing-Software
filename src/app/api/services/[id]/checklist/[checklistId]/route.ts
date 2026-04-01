import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const { checklistId: rawCid } = await params;
    const checklistId = Number(rawCid);
    if (isNaN(checklistId)) return NextResponse.json({ error: "Invalid checklist ID" }, { status: 400 });

    const body = await request.json();
    const data: any = {};
    if (body.documentName !== undefined) data.documentName = body.documentName.trim();
    if (body.isRequired !== undefined) data.isRequired = Boolean(body.isRequired);
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

    const item = await prisma.serviceChecklist.update({ where: { id: checklistId }, data });
    return NextResponse.json({ data: item });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }
    console.error("Failed to update checklist item:", error);
    return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const { checklistId: rawCid } = await params;
    const checklistId = Number(rawCid);
    if (isNaN(checklistId)) return NextResponse.json({ error: "Invalid checklist ID" }, { status: 400 });

    await prisma.serviceChecklist.delete({ where: { id: checklistId } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }
    console.error("Failed to delete checklist item:", error);
    return NextResponse.json({ error: "Failed to delete checklist item" }, { status: 500 });
  }
}
