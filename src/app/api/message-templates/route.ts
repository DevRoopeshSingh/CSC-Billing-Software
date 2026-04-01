import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get("channel");
    const active = searchParams.get("active");

    const where: any = {};
    if (channel) where.channel = channel;
    if (active !== null && active !== undefined && active !== "") {
      where.isActive = active === "true";
    }

    const data = await prisma.messageTemplate.findMany({
      where,
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch message templates:", error);
    return NextResponse.json({ error: "Failed to fetch message templates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim() || !body.body?.trim()) {
      return NextResponse.json(
        { error: "Template name and body are required" },
        { status: 400 }
      );
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name: body.name.trim(),
        channel: body.channel || "whatsapp",
        body: body.body.trim(),
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("Failed to create message template:", error);
    return NextResponse.json({ error: "Failed to create message template" }, { status: 500 });
  }
}
