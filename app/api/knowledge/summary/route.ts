import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Fetch from database
    // const stats = await db.knowledge.aggregate({
    //   _count: { id: true },
    //   _count: { where: { updatedAt: { gte: new Date(Date.now() - 86400000) } } },
    //   _count: { where: { status: "in_review" } }
    // });

    // Mock data
    const mockStats = {
      totalEntries: 127,
      recentChanges24h: 8,
      pendingApprovals: 3,
      popularTags: [
        { tag: "#prozesse", count: 45 },
        { tag: "#richtlinien", count: 32 },
        { tag: "#anleitungen", count: 28 },
      ],
    };

    return NextResponse.json(mockStats);
  } catch (error) {
    console.error("Failed to fetch knowledge summary:", error);
    return NextResponse.json({ error: "Failed to fetch summary" }, { status: 500 });
  }
}
