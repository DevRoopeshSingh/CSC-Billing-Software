import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const serviceId = Number(rawId);
    if (isNaN(serviceId)) return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });

    const data = await prisma.serviceChecklist.findMany({
      where: { serviceId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch service checklist:", error);
    return NextResponse.json({ error: "Failed to fetch service checklist" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const serviceId = Number(rawId);
    if (isNaN(serviceId)) return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });

    const body = await request.json();

    if (!body.documentName?.trim()) {
      return NextResponse.json({ error: "Document name is required" }, { status: 400 });
    }

    // Verify service exists
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const item = await prisma.serviceChecklist.create({
      data: {
        serviceId,
        documentName: body.documentName.trim(),
        isRequired: body.isRequired !== false,
        notes: body.notes || "",
        sortOrder: Number(body.sortOrder ?? 0),
      },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("Failed to create checklist item:", error);
    return NextResponse.json({ error: "Failed to create checklist item" }, { status: 500 });
  }
}
