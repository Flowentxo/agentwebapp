import { NextRequest, NextResponse } from "next/server";
import { knowledgeStore } from "@/lib/knowledge/store";

/**
 * POST /api/ask - Ask a question
 * Features: Rate-Limit (5/min per client), Cache, Extractive Answer + Sources
 * Headers: x-client-id (optional, defaults to "anon")
 * Query: ?debug=1 for debug info
 */

export async function POST(req: NextRequest) {
  try {
    // Get client ID from header
    const clientId = req.headers.get("x-client-id") || "anon";

    // Rate limit check
    const rateCheck = knowledgeStore.checkRateLimit(clientId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "rate_limited", message: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 }
      );
    }

    // Check for debug flag
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";

    const response = knowledgeStore.ask(query, debug);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("POST /api/ask error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
