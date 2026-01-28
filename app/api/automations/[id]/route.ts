import { NextRequest, NextResponse } from "next/server";
import { automationsStore } from "@/lib/automations/store";

/**
 * GET /api/automations/[id] - Get single automation
 * PATCH /api/automations/[id] - Update automation (title, schedule, enabled)
 * DELETE /api/automations/[id] - Delete automation
 * POST /api/automations/[id]?action=run - Trigger automation manually ("Run now")
 */

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const a = automationsStore.get(params.id);
    if (!a) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(a, { status: 200 });
  } catch (error: any) {
    console.error(`GET /api/automations/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patch = await req.json();

    const updated = automationsStore.update(params.id, {
      title: typeof patch.title === "string" ? patch.title : undefined,
      schedule: typeof patch.schedule === "string" ? patch.schedule : undefined,
      enabled: typeof patch.enabled === "boolean" ? patch.enabled : undefined,
    });

    if (!updated)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error(`PATCH /api/automations/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ok = automationsStore.delete(params.id);
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error(`DELETE /api/automations/${params.id} error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action !== "run") {
      return NextResponse.json(
        { error: "unsupported_action" },
        { status: 400 }
      );
    }

    const a = automationsStore.get(params.id);
    if (!a) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { runId } = await automationsStore.trigger(a);

    return NextResponse.json({ ok: true, runId }, { status: 200 });
  } catch (error: any) {
    console.error(`POST /api/automations/${params.id}?action=run error:`, error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
