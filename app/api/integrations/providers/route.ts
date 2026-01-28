import { NextRequest, NextResponse } from "next/server";
import { integrationsStore } from "@/lib/integrations/store";

/**
 * GET /api/integrations/providers - List all providers (secrets masked)
 * POST /api/integrations/providers - Create provider (optionally with secret)
 */

export async function GET() {
  try {
    const providers = integrationsStore.listProvidersWithMaskedSecrets();
    return NextResponse.json(providers, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/integrations/providers error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name, config, secret } = body || {};

    if (!type || !name) {
      return NextResponse.json(
        { error: "type and name required" },
        { status: 400 }
      );
    }

    const provider = integrationsStore.createProvider({
      type,
      name,
      config,
      secret,
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/integrations/providers error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
