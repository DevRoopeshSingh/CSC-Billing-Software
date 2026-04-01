import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.agentType || !body.role || !body.content) {
      return NextResponse.json(
        { error: "agentType, role, and content are required" },
        { status: 400 }
      );
    }

    const entry = await prisma.agentLog.create({
      data: {
        agentType: body.agentType,
        sessionId: body.sessionId || "",
        role: body.role,
        content: body.content,
        toolName: body.toolName || "",
        toolInput: body.toolInput || "",
        durationMs: Number(body.durationMs || 0),
      },
    });

    return NextResponse.json({ data: { id: entry.id } }, { status: 201 });
  } catch (error) {
    console.error("Failed to log agent interaction:", error);
    return NextResponse.json({ error: "Failed to log agent interaction" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const agentType = searchParams.get("agentType");
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (agentType) where.agentType = agentType;

    const logs = await prisma.agentLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Failed to fetch agent logs:", error);
    return NextResponse.json({ error: "Failed to fetch agent logs" }, { status: 500 });
  }
}
