import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const published = searchParams.get("published");
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
    const offset = Number(searchParams.get("offset") || 0);

    const where: any = {};

    if (search) {
      where.OR = [
        { question: { contains: search } },
        { answer: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (published !== null && published !== undefined && published !== "") {
      where.isPublished = published === "true";
    }

    const [data, total] = await Promise.all([
      prisma.faqEntry.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.faqEntry.count({ where }),
    ]);

    return NextResponse.json({ data, total });
  } catch (error) {
    console.error("Failed to fetch FAQ entries:", error);
    return NextResponse.json({ error: "Failed to fetch FAQ entries" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.question?.trim() || !body.answer?.trim()) {
      return NextResponse.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    const entry = await prisma.faqEntry.create({
      data: {
        question: body.question.trim(),
        answer: body.answer.trim(),
        category: body.category || "General",
        tags: body.tags || "",
        isPublished: body.isPublished !== false,
        sortOrder: Number(body.sortOrder ?? 0),
      },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("Failed to create FAQ entry:", error);
    return NextResponse.json({ error: "Failed to create FAQ entry" }, { status: 500 });
  }
}
