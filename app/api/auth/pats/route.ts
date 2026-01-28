import { NextRequest, NextResponse } from "next/server";
import {
  createPAT,
  listPATsForUser,
  principalFromRequest,
  requireScopesOrThrow,
} from "@/lib/auth/store";

// Force Node.js runtime (crypto module required)
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const pr = principalFromRequest(req);

  if (pr.type !== "user")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const items = listPATsForUser(pr.user!.id);

  return NextResponse.json(items, { status: 200 });
}

export async function POST(req: NextRequest) {
  const pr = principalFromRequest(req);

  if (pr.type !== "user")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // creating PAT requires editor or admin rights (has write-ish scopes)
  try {
    requireScopesOrThrow(pr, ["knowledge:write"]); // proxy for elevated role
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { name, scopes, kind } = await req.json();

  const s = Array.isArray(scopes) ? (scopes as any[]) : [];
  const validScopes = s.filter((x) => typeof x === "string");

  const { pat, tokenPlaintext, masked } = createPAT({
    kind: kind === "service" ? "service" : "user",
    name: String(name || "Token"),
    scopes: validScopes as any,
    ownerUserId: pr.user!.id,
  });

  return NextResponse.json(
    {
      token: tokenPlaintext,
      pat: {
        id: pat.id,
        name: pat.name,
        masked,
        scopes: pat.scopes,
        createdAt: pat.createdAt,
      },
    },
    { status: 201 }
  );
}
