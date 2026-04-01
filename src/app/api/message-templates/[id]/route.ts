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
    if (body.channel !== undefined) data.channel = body.channel;
    if (body.body !== undefined) data.body = body.body.trim();
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const template = await prisma.messageTemplate.update({ where: { id }, data });
    return NextResponse.json({ data: template });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Message template not found" }, { status: 404 });
    }
    console.error("Failed to update message template:", error);
    return NextResponse.json({ error: "Failed to update message template" }, { status: 500 });
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

    await prisma.messageTemplate.delete({ where: { id } });
    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Message template not found" }, { status: 404 });
    }
    console.error("Failed to delete message template:", error);
    return NextResponse.json({ error: "Failed to delete message template" }, { status: 500 });
  }
}
