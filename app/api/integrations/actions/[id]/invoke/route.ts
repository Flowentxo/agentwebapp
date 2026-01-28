import { NextRequest, NextResponse } from "next/server";
import { integrationsStore } from "@/lib/integrations/store";

/**
 * POST /api/integrations/actions/[id]/invoke - Invoke action with context
 */

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { context } = body || {};

    if (!context || typeof context !== "object") {
      return NextResponse.json(
        { error: "context object required" },
        { status: 400 }
      );
    }

    const delivery = integrationsStore.invokeAction(params.id, context);

    return NextResponse.json(delivery, { status: 200 });
  } catch (error: any) {
    console.error(
      `POST /api/integrations/actions/${params.id}/invoke error:`,
      error
    );
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
