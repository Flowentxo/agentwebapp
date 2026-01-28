import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/data/agents";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = AGENTS.find((a) => a.id === params.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }
  return NextResponse.json(agent, { status: 200 });
}
