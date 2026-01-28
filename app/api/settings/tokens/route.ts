import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    // TODO: Validate session
    // const session = await getSession(req);
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // TODO: Fetch user's API tokens from database
    // const tokens = await db.apiToken.findMany({
    //   where: { userId: session.userId },
    //   select: { id, name, prefix, createdAt, lastUsed }
    // });

    // Mock response
    return NextResponse.json({
      tokens: [
        {
          id: "tok-1",
          name: "Default API Key",
          prefix: "flwnt_live_xxxxxxxxxxxxx",
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      ],
    });
  } catch (error) {
    console.error("Failed to fetch API tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // TODO: Validate session
    // const session = await getSession(req);
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    if (action === "rotate") {
      // Generate new API key
      const newKey = `flwnt_live_${crypto.randomBytes(24).toString("hex")}`;

      // TODO: Invalidate old key and store new one
      // await db.apiToken.update({
      //   where: { userId: session.userId },
      //   data: {
      //     token: await hash(newKey),
      //     rotatedAt: new Date()
      //   }
      // });

      // TODO: Log to audit trail
      // await logAudit({
      //   action: "api_key_rotated",
      //   userId: session.userId,
      //   category: "security"
      // });

      return NextResponse.json({
        success: true,
        message: "API key rotated successfully",
        newKey,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to rotate API key:", error);
    return NextResponse.json(
      { error: "Failed to rotate key" },
      { status: 500 }
    );
  }
}
