import { NextRequest, NextResponse } from "next/server";
import { safeDownloadName, audit } from "@/lib/security/security";

/**
 * GET /api/download?type=logs&name=<file>&content=<urlencoded>
 * Secure download endpoint with sanitized filenames
 * - Sanitizes filename to prevent directory traversal
 * - Caps content at 200KB
 * - Sets proper Content-Type and Content-Disposition headers
 * - Audits all downloads
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    // Only support 'logs' type for now
    if (type !== "logs") {
      return NextResponse.json(
        { error: "unsupported_type" },
        { status: 400 }
      );
    }

    const rawName = url.searchParams.get("name") ?? "logs.txt";
    const rawContent = url.searchParams.get("content") ?? "";

    // Sanitize filename (removes special chars, max 64 chars)
    const safeName = safeDownloadName(rawName);

    // Cap content at 200KB
    const content = rawContent.slice(0, 200_000);

    // Audit the download
    audit.log({
      actor: "web",
      action: "download",
      target: safeName,
      meta: { size: content.length, type },
    });

    // Return with secure headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
