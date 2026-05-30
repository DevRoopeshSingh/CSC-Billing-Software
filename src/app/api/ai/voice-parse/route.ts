import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SCHEMA_CONTEXT = `
You are an intent parser for a Common Service Centre billing app.
Extract the customer's name and the requested services from the spoken transcript.
Return JSON matching the schema. If a quantity isn't specified, assume 1.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    customerName: { type: Type.STRING },
    services: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          qty: { type: Type.NUMBER }
        }
      }
    }
  },
  required: ["customerName", "services"]
};

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    
    if (!transcript) {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: transcript,
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
    console.error("Voice Parse Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse voice intent" }, { status: 500 });
  }
}
