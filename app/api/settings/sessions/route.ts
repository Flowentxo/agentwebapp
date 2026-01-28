import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // TODO: Validate session
    // const session = await getSession(req);
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // TODO: Fetch user sessions from database
    // const sessions = await db.session.findMany({
    //   where: { userId: session.userId },
    //   select: { id, device, location, lastAccess, isCurrent }
    // });

    // Mock response
    const mockSessions = [
      {
        id: "sess-1",
        device: "Chrome auf Windows",
        location: "Berlin, Deutschland",
        lastAccess: new Date().toISOString(),
        current: true,
      },
      {
        id: "sess-2",
        device: "Safari auf iPhone",
        location: "München, Deutschland",
        lastAccess: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        current: false,
      },
    ];

    return NextResponse.json({ sessions: mockSessions });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // TODO: Validate session
    // const session = await getSession(req);
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // TODO: Delete all sessions except current
    // await db.session.deleteMany({
    //   where: {
    //     userId: session.userId,
    //     id: { not: session.sessionId }
    //   }
    // });

    // TODO: Log to audit trail
    // await logAudit({
    //   action: "all_sessions_logged_out",
    //   userId: session.userId,
    //   category: "security"
    // });

    return NextResponse.json({
      success: true,
      message: "All sessions logged out",
    });
  } catch (error) {
    console.error("Failed to logout all sessions:", error);
    return NextResponse.json(
      { error: "Failed to logout sessions" },
      { status: 500 }
    );
  }
}
