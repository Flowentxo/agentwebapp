import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/security/security";

/**
 * POST /api/security/csp-report
 * Receives CSP violation reports from browsers
 * Logs to audit chain without echoing sensitive data
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log CSP violation to audit chain
    audit.log({
      actor: "browser",
      action: "csp_violation",
      target: "csp",
      meta: body,
    });

    // Return 204 No Content (standard for CSP reports)
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error("CSP report error:", error);

    // Still return 204 to not leak error info to browser
    return new NextResponse(null, { status: 204 });
  }
}
