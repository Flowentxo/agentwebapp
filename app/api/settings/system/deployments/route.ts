import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // TODO: Validate admin session
    // const session = await getSession(req);
    // if (!session || session.role !== "admin") {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // TODO: Fetch recent deployments from database
    // const deployments = await db.deployment.findMany({
    //   take: limit,
    //   orderBy: { timestamp: "desc" }
    // });

    // Mock response
    const mockDeployments = [
      {
        id: "dep-1",
        version: "v3.2.1",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: "success" as const,
        user: "admin@sintra.ai",
      },
      {
        id: "dep-2",
        version: "v3.2.0",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        status: "success" as const,
        user: "admin@sintra.ai",
      },
      {
        id: "dep-3",
        version: "v3.1.9",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        status: "failed" as const,
        user: "admin@sintra.ai",
      },
    ];

    return NextResponse.json({ deployments: mockDeployments.slice(0, limit) });
  } catch (error) {
    console.error("Failed to fetch deployments:", error);
    return NextResponse.json(
      { error: "Failed to fetch deployments" },
      { status: 500 }
    );
  }
}
