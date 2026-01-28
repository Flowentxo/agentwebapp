import { NextRequest, NextResponse } from "next/server";
import { automationsStore } from "@/lib/automations/store";

/**
 * GET /api/automations - List all automations
 * POST /api/automations - Create new automation
 */

export async function GET() {
  try {
    const items = automationsStore.list();
    return NextResponse.json(items, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/automations error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, schedule, action } = body || {};

    if (!action || action.type !== "agent.run" || !action.agentId) {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    if (typeof schedule !== "string" || !schedule.trim()) {
      return NextResponse.json({ error: "invalid_schedule" }, { status: 400 });
    }

    const a = automationsStore.create({
      title: String(title || ""),
      schedule,
      action,
    });

    return NextResponse.json(a, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/automations error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
