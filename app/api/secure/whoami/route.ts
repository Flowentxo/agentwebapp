export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { principalFromRequest } from "@/lib/auth/store";

export async function GET(req: NextRequest) {
  const pr = principalFromRequest(req);
  return NextResponse.json({ principal: pr }, { status: 200 });
}
