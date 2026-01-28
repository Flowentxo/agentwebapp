import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  destroySession,
  ensureDevUser,
  principalFromRequest,
  SID_SEP,
} from "@/lib/auth/store";

// Force Node.js runtime (crypto module required)
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const pr = principalFromRequest(req);

  return NextResponse.json(
    pr.type === "user"
      ? { type: pr.type, user: pr.user, scopes: pr.scopes }
      : { type: pr.type, scopes: pr.scopes },
    { status: 200 }
  );
}

// DEV login: email + optional roles (admin|editor|viewer)
export async function POST(req: NextRequest) {
  const { email, name, roles } = await req.json();

  if (!email)
    return NextResponse.json({ error: "email_required" }, { status: 400 });

  const user = ensureDevUser(
    String(email),
    name ? String(name) : undefined,
    Array.isArray(roles) ? roles : undefined
  );

  const { cookieValue } = createSession(user.id);

  const res = NextResponse.json(
    {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, roles: user.roles },
    },
    { status: 200 }
  );

  res.cookies.set("sid", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}

export async function DELETE(req: NextRequest) {
  const cookie = req.cookies.get("sid")?.value;

  if (cookie) {
    const parts = cookie.split(SID_SEP);
    const sid = parts[0];
    destroySession(sid);
  }

  const res = NextResponse.json({ ok: true }, { status: 200 });

  res.cookies.set("sid", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
