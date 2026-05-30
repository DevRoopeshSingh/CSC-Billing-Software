import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SCHEMA_CONTEXT = `
You are an assistant for a Common Service Centre (CSC).
Generate a polite, professional payment reminder for an overdue invoice.
Tone: Helpful, polite, clear.
You must output a JSON object containing two fields:
- emailBody: The text for an email reminder.
- whatsappBody: A shorter, emoji-friendly text for WhatsApp.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    emailBody: { type: Type.STRING },
    whatsappBody: { type: Type.STRING }
  },
  required: ["emailBody", "whatsappBody"]
};

export async function POST(req: NextRequest) {
  try {
    const { customerName, invoiceId, amount, dueDate, services } = await req.json();
    if (!customerName || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = `Customer Name: ${customerName}\nInvoice No: ${invoiceId || 'N/A'}\nAmount Due: ₹${amount}\nDue Date: ${dueDate || 'N/A'}\nServices: ${(services || []).join(', ')}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SCHEMA_CONTEXT,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });
    
    if (!response.text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const result = JSON.parse(response.text);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Reminder Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate reminder" }, { status: 500 });
  }
}
