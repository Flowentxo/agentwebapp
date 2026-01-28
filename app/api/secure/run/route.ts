export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { principalFromRequest, requireScopesOrThrow } from "@/lib/auth/store";
import { runsStore } from "@/lib/agents/store";

export async function GET(req: NextRequest) {
  const pr = principalFromRequest(req);
  return NextResponse.json({ principal: pr }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const pr = principalFromRequest(req);

  try {
    requireScopesOrThrow(pr, ["agents:run"]);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.code || "forbidden" },
      { status: e.status || 403 }
    );
  }

  const { agentId } = await req.json();

  if (!agentId)
    return NextResponse.json({ error: "agentId_required" }, { status: 400 });

  const run = runsStore.createRun(agentId);

  return NextResponse.json({ ok: true, runId: run.id }, { status: 200 });
}
