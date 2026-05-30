import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SCHEMA_CONTEXT = `
You are a predictive engine for a Common Service Centre. 
Based on this customer's past services, suggest up to 3 other likely services they might need today.
Output must be a JSON object with 'suggestedServices' array of strings.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestedServices: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["suggestedServices"]
};

export async function POST(req: NextRequest) {
  try {
    const { customerId, pastServices } = await req.json();
    
    if (!pastServices || !Array.isArray(pastServices)) {
      return NextResponse.json({ error: "Invalid pastServices" }, { status: 400 });
    }

    const prompt = `Customer's past services: ${pastServices.join(', ')}. Suggest 3 new services.`;

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
    console.error("Suggestions Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate suggestions" }, { status: 500 });
  }
}
