import { NextRequest, NextResponse } from "next/server";
import { integrationsStore } from "@/lib/integrations/store";

/**
 * GET /api/integrations/actions - List all actions
 * POST /api/integrations/actions - Create action
 */

export async function GET() {
  try {
    const actions = integrationsStore.listActions();
    return NextResponse.json(actions, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/integrations/actions error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { providerId, name, payloadTemplate, headersTemplate } = body || {};

    if (!providerId || !name || !payloadTemplate) {
      return NextResponse.json(
        { error: "providerId, name, and payloadTemplate required" },
        { status: 400 }
      );
    }

    const action = integrationsStore.createAction({
      providerId,
      name,
      payloadTemplate,
      headersTemplate,
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/integrations/actions error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
