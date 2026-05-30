import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { getReadOnlyDb } from "@/server/db";
import { sql } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SCHEMA_CONTEXT = `
You are a PostgreSQL expert for a Billing System. Convert the user's natural language question into a read-only Postgres query.
Table 'invoices': id, invoice_no, created_at, customer_id, total, status (PAID/PENDING/CANCELLED)
Table 'invoice_items': id, invoice_id, service_id, qty, rate, line_total
Table 'services': id, name
Table 'customers': id, name, mobile
Rules:
1. ONLY return a JSON object with 'query' (the SQL string) and 'explanation'.
2. The query MUST be a valid PostgreSQL SELECT statement. DO NOT include formatting like \`\`\`sql.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    query: { type: Type.STRING },
    explanation: { type: Type.STRING }
  },
  required: ["query", "explanation"]
};

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

    const db = getReadOnlyDb();
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: query,
      config: {
        systemInstruction: SCHEMA_CONTEXT,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });
    
    if (!response.text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const aiResult = JSON.parse(response.text);
    
    // Safety check: ensure it's a SELECT statement
    if (!aiResult.query.trim().toUpperCase().startsWith("SELECT")) {
        return NextResponse.json({ error: "Only SELECT queries are allowed." }, { status: 400 });
    }
    
    // Execute the generated SQL safely (Read Only)
    // NOTE: In production, ensure the DB connection is strictly read-only
    const result = await db.execute(sql.raw(aiResult.query));
    
    return NextResponse.json({ data: result, explanation: aiResult.explanation, sql: aiResult.query });
  } catch (error: any) {
    console.error("Copilot Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process query" }, { status: 500 });
  }
}
