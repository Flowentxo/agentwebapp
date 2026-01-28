import { NextRequest, NextResponse } from "next/server";
import { automationsStore } from "@/lib/automations/store";

/**
 * POST /api/automations/tick - Trigger tick (evaluate all automations and run due ones)
 * Used for deterministic E2E testing
 */

export async function POST(_: NextRequest) {
  try {
    const results = await automationsStore.tick(new Date());
    return NextResponse.json({ triggered: results }, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/automations/tick error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
