import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since") || "24h";

    // TODO: Calculate time range based on 'since' parameter
    // const timeRange = parseTimeRange(since); // e.g., "24h" -> 24 hours ago

    // TODO: Fetch from database
    // const session = await getSession(req);
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // const activities = await db.boardActivity.findMany({
    //   where: {
    //     timestamp: { gte: timeRange }
    //   },
    //   orderBy: { timestamp: "desc" },
    //   take: 50
    // });

    // Mock data
    const mockActivities = [
      {
        id: "act-1",
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        user: "Anna Schmidt",
        action: "änderte Status von",
        target: "Dexter Analytics",
        fromStatus: "pending",
        toStatus: "active",
      },
      {
        id: "act-2",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        user: "Max Müller",
        action: "archivierte",
        target: "Legacy Agent",
        fromStatus: "stopped",
        toStatus: "archived",
      },
      {
        id: "act-3",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        user: "Lisa Weber",
        action: "erstellte",
        target: "Kai Knowledge",
      },
      {
        id: "act-4",
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        user: "Tom Fischer",
        action: "änderte Status von",
        target: "Finn Finance",
        fromStatus: "active",
        toStatus: "stopped",
      },
      {
        id: "act-5",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        user: "Anna Schmidt",
        action: "bearbeitete",
        target: "Cassie Support",
      },
    ];

    return NextResponse.json({
      activities: mockActivities,
      since,
    });
  } catch (error) {
    console.error("Failed to fetch activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
