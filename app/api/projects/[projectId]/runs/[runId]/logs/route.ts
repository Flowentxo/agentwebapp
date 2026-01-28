import { NextRequest, NextResponse } from "next/server";
import { redact } from "@/lib/security/redact";
import * as Runs from "@/lib/runs/store";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; runId: string } }
) {
  try {
    const { projectId, runId } = params;
    const raw = await Runs.getRunLogs(projectId, runId); // array of log entries

    // Apply redaction to all log messages and details
    const redacted = raw.map((e: any) => ({
      ...e,
      message: typeof e.message === "string" ? redact(e.message) : e.message,
      // If you carry structured fields that may contain PII, run redact on them too:
      details: typeof e.details === "string" ? redact(e.details) : e.details,
    }));

    return new NextResponse(JSON.stringify({ ok: true, logs: redacted }), {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ ok: false, error: e?.message ?? "unknown" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
