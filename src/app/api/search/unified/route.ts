import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const typesParam = searchParams.get("types");
    const limit = Math.min(Number(searchParams.get("limit") || 5), 20);

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    const searchTerm = q.trim();
    const types = typesParam ? typesParam.split(",") : ["customers", "invoices", "services", "faq"];

    const results: Record<string, any[]> = {};

    // Search Customers
    if (types.includes("customers")) {
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm } },
            { mobile: { contains: searchTerm } },
            { tags: { contains: searchTerm } },
          ],
        },
        take: limit,
        orderBy: { name: "asc" },
        select: { id: true, name: true, mobile: true, tags: true },
      });
      results.customers = customers.map((c) => ({ ...c, _type: "customer" }));
    }

    // Search Invoices
    if (types.includes("invoices")) {
      const invoiceWhere: any = {
        OR: [
          { customer: { name: { contains: searchTerm } } },
          { customer: { mobile: { contains: searchTerm } } },
          { invoiceNo: { contains: searchTerm } },
        ],
      };
      const searchNum = Number(searchTerm);
      if (!isNaN(searchNum)) {
        invoiceWhere.OR.push({ id: searchNum });
      }

      const invoices = await prisma.invoice.findMany({
        where: invoiceWhere,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          invoiceNo: true,
          total: true,
          status: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      });
      results.invoices = invoices.map((inv) => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        total: inv.total,
        status: inv.status,
        customerName: inv.customer.name,
        createdAt: inv.createdAt,
        _type: "invoice",
      }));
    }

    // Search Services
    if (types.includes("services")) {
      const services = await prisma.service.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm } },
            { category: { contains: searchTerm } },
            { keywords: { contains: searchTerm } },
          ],
          isActive: true,
        },
        take: limit,
        orderBy: { name: "asc" },
        select: { id: true, name: true, category: true, defaultPrice: true },
      });
      results.services = services.map((s) => ({ ...s, _type: "service" }));
    }

    // Search FAQ
    if (types.includes("faq")) {
      const faq = await prisma.faqEntry.findMany({
        where: {
          isPublished: true,
          OR: [
            { question: { contains: searchTerm } },
            { answer: { contains: searchTerm } },
            { tags: { contains: searchTerm } },
          ],
        },
        take: limit,
        orderBy: { sortOrder: "asc" },
        select: { id: true, question: true, category: true },
      });
      results.faq = faq.map((f) => ({ ...f, _type: "faq" }));
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("Unified search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
