export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import {
  createPAT,
  listServicePATs,
  principalFromRequest,
  requireScopesOrThrow,
} from "@/lib/auth/store";

// Create/list service account tokens (admin only)
export async function GET(req: NextRequest) {
  const pr = principalFromRequest(req);

  try {
    requireScopesOrThrow(pr, ["admin:*"]);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json(listServicePATs(), { status: 200 });
}

export async function POST(req: NextRequest) {
  const pr = principalFromRequest(req);

  try {
    requireScopesOrThrow(pr, ["admin:*"]);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { name, scopes } = await req.json();

  const { pat, tokenPlaintext, masked } = createPAT({
    kind: "service",
    name: String(name || "Service"),
    scopes: (scopes || []) as any,
  });

  return NextResponse.json(
    {
      id: pat.id,
      name: pat.name,
      masked,
      token: tokenPlaintext,
      scopes: pat.scopes,
    },
    { status: 201 }
  );
}
