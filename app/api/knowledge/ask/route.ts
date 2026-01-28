import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question } = body;

    // TODO: Integrate with AI agent for Q&A
    // const response = await askKnowledgeBase(question);

    // Mock AI response
    const mockResponse = {
      answer: "Basierend auf den Prozessrichtlinien sollten Kundenanfragen innerhalb von 24 Stunden bearbeitet werden. Der Standard-Workflow umfasst: Erstaufnahme → Kategorisierung → Zuweisung → Bearbeitung → Abschluss.",
      sources: [
        {
          entryId: "kb-1",
          title: "Prozessrichtlinie für Kundenanfragen",
          relevance: 0.95,
        },
      ],
      confidence: 0.88,
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error("Ask failed:", error);
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 });
  }
}
