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
    if (body.question !== undefined) data.question = body.question.trim();
    if (body.answer !== undefined) data.answer = body.answer.trim();
    if (body.category !== undefined) data.category = body.category;
    if (body.tags !== undefined) data.tags = body.tags;
    if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

    const entry = await prisma.faqEntry.update({ where: { id }, data });
    return NextResponse.json({ data: entry });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "FAQ entry not found" }, { status: 404 });
    }
    console.error("Failed to update FAQ entry:", error);
    return NextResponse.json({ error: "Failed to update FAQ entry" }, { status: 500 });
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

    await prisma.faqEntry.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "FAQ entry not found" }, { status: 404 });
    }
    console.error("Failed to delete FAQ entry:", error);
    return NextResponse.json({ error: "Failed to delete FAQ entry" }, { status: 500 });
  }
}
