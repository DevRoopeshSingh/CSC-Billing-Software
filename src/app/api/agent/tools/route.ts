import { NextResponse } from "next/server";
import { AGENT_TOOLS } from "@/lib/agent-tools";

export async function GET() {
  // Return the tool manifest in OpenAI function-calling format
  const tools = AGENT_TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
    allowedAgents: tool.allowedAgents,
    riskLevel: tool.riskLevel,
  }));

  return NextResponse.json({ data: { tools } });
}
