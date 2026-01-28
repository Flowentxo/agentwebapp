import { NextResponse } from "next/server";

export async function GET() {
  try {
    // TODO: Fetch from database
    // const entries = await db.knowledgeEntry.findMany({
    //   orderBy: { updatedAt: "desc" },
    //   take: 10
    // });

    // Mock data
    const mockEntries = [
      {
        id: "kb-1",
        title: "Prozessrichtlinie für Kundenanfragen",
        content: "Standard Operating Procedure für die Bearbeitung...",
        category: "Prozesse",
        tags: ["#prozesse", "#support"],
        author: "admin@sintra.ai",
        authorEmail: "admin@sintra.ai",
        status: "published",
        version: 3,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      },
      {
        id: "kb-2",
        title: "Datenschutzrichtlinie DSGVO",
        content: "Compliance-Anforderungen und Umsetzung...",
        category: "Richtlinien",
        tags: ["#richtlinien", "#compliance"],
        author: "legal@sintra.ai",
        authorEmail: "legal@sintra.ai",
        status: "in_review",
        version: 1,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ];

    return NextResponse.json({ entries: mockEntries });
  } catch (error) {
    console.error("Failed to fetch recent entries:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}
