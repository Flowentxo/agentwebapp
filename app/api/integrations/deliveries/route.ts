import { NextRequest, NextResponse } from "next/server";
import { integrationsStore } from "@/lib/integrations/store";

/**
 * GET /api/integrations/deliveries - List recent deliveries
 */

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const deliveries = integrationsStore.listDeliveries(limit);
    return NextResponse.json(deliveries, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/integrations/deliveries error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
