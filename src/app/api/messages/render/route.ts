import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    const template = await prisma.messageTemplate.findUnique({
      where: { id: Number(body.templateId) },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const variables: Record<string, string> = body.variables || {};
    let renderedBody = template.body;

    // Replace all {{variableName}} placeholders with actual values
    for (const [key, value] of Object.entries(variables)) {
      renderedBody = renderedBody.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, "g"),
        String(value)
      );
    }

    // Remove any unreplaced placeholders
    renderedBody = renderedBody.replace(/\{\{[^}]+\}\}/g, "");

    return NextResponse.json({
      data: {
        renderedBody: renderedBody.trim(),
        channel: template.channel,
        templateName: template.name,
      },
    });
  } catch (error) {
    console.error("Failed to render message:", error);
    return NextResponse.json({ error: "Failed to render message" }, { status: 500 });
  }
}
