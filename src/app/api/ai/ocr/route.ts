import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SCHEMA_CONTEXT = `
You are an expert data extraction tool.
Extract billing details from the provided receipt or invoice image.
Return a JSON object matching this schema. If a value is not found, leave it empty or 0.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    vendorName: { type: Type.STRING },
    total: { type: Type.NUMBER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          qty: { type: Type.NUMBER },
          rate: { type: Type.NUMBER }
        }
      }
    }
  },
  required: ["vendorName", "total", "items"]
};

export async function POST(req: NextRequest) {
  try {
    const { mimeType, data } = await req.json();
    if (!mimeType || !data) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: data
          }
        },
        "Extract billing details from this receipt as JSON."
      ],
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
    console.error("OCR Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process image" }, { status: 500 });
  }
}
