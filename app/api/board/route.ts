import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // TODO: Fetch from database
    // const session = await getSession(req);
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    // Mock data
    const mockCards = [
      {
        id: "card-1",
        name: "Dexter Analytics",
        description: "Datenanalyse und Business Intelligence für Finanzberichte",
        status: "active",
        tags: ["#analytics", "#prod"],
        statusBadge: "success",
        owner: "admin@sintra.ai",
        lastModified: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        metrics: {
          successRate: 98.5,
          errorRate: 1.5,
          runtime: 245,
          requests: 12453,
        },
      },
      {
        id: "card-2",
        name: "Cassie Support",
        description: "Kundenservice-Agent für E-Mail und Chat-Support",
        status: "active",
        tags: ["#support", "#nlp"],
        statusBadge: "success",
        owner: "support@sintra.ai",
        lastModified: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        metrics: {
          successRate: 95.2,
          errorRate: 4.8,
          runtime: 312,
          requests: 8765,
        },
      },
      {
        id: "card-3",
        name: "Kai Knowledge",
        description: "RAG-basierter Wissensmanagement-Agent",
        status: "pending",
        tags: ["#knowledge", "#rag"],
        statusBadge: "warning",
        owner: "admin@sintra.ai",
        lastModified: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
      {
        id: "card-4",
        name: "Finn Finance",
        description: "Finanzprognosen und Budget-Analysen",
        status: "stopped",
        tags: ["#finance", "#forecasting"],
        statusBadge: "error",
        owner: "finance@sintra.ai",
        lastModified: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      },
    ];

    const mockStats = {
      activeAgents: 2,
      inactiveAgents: 2,
      incidents24h: 1,
      successRate: 96.5,
    };

    return NextResponse.json({
      cards: mockCards,
      stats: mockStats,
    });
  } catch (error) {
    console.error("Failed to fetch board data:", error);
    return NextResponse.json(
      { error: "Failed to fetch board data" },
      { status: 500 }
    );
  }
}
