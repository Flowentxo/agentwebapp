/**
 * Knowledge Graph API
 *
 * Provides graph data for visualization:
 * - Nodes: Memories, documents, ideas, questions
 * - Edges: Connections between nodes based on similarity/references
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

interface GraphNode {
  id: string;
  label: string;
  type: "memory" | "document" | "idea" | "question" | "agent";
  connections: number;
  description?: string;
  createdAt?: string;
  tags?: string[];
}

interface GraphEdge {
  source: string;
  target: string;
  strength: number;
  type?: "reference" | "similarity" | "temporal";
}

/**
 * GET - Fetch knowledge graph data
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Fetch memories/knowledge items
    try {
      const memories = await db.execute(sql`
        SELECT
          id,
          title,
          content,
          source,
          tags,
          created_at
        FROM brain_memories
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const memoryRows = memories as unknown as Array<{
        id: string;
        title: string;
        content: string;
        source?: string;
        tags?: string[];
        created_at: Date;
      }>;

      for (const memory of memoryRows) {
        const type = categorizeContent(memory.source, memory.content);
        nodes.push({
          id: memory.id,
          label: memory.title || "Untitled",
          type,
          connections: 0, // Will be calculated
          description: memory.content?.slice(0, 200),
          createdAt: memory.created_at?.toISOString(),
          tags: Array.isArray(memory.tags) ? memory.tags : [],
        });
      }
    } catch (err) {
      console.log("[GRAPH_API] brain_memories table not available");
    }

    // Fetch brain documents
    try {
      const documents = await db.execute(sql`
        SELECT
          id,
          title,
          content,
          metadata,
          created_at,
          status
        FROM brain_documents
        WHERE workspace_id = 'default-workspace'
          AND status = 'published'
          AND is_active = true
        ORDER BY created_at DESC
        LIMIT 30
      `);

      const docRows = documents as unknown as Array<{
        id: string;
        title: string;
        content: string;
        metadata?: { tags?: string[]; category?: string };
        created_at: Date;
        status: string;
      }>;

      for (const doc of docRows) {
        nodes.push({
          id: `doc-${doc.id}`,
          label: doc.title || "Document",
          type: "document",
          connections: 0,
          description: doc.content?.slice(0, 200),
          createdAt: doc.created_at?.toISOString(),
          tags: doc.metadata?.tags || [],
        });
      }
    } catch (err) {
      console.log("[GRAPH_API] brain_documents table not available");
    }

    // Fetch business ideas
    try {
      const ideas = await db.execute(sql`
        SELECT
          id,
          title,
          description,
          category,
          tags,
          created_at,
          votes_up,
          votes_down
        FROM brain_business_ideas
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
      `);

      const ideaRows = ideas as unknown as Array<{
        id: string;
        title: string;
        description: string;
        category?: string;
        tags?: string[];
        created_at: Date;
        votes_up: number;
        votes_down: number;
      }>;

      for (const idea of ideaRows) {
        nodes.push({
          id: `idea-${idea.id}`,
          label: idea.title || "Business Idea",
          type: "idea",
          connections: Math.abs(idea.votes_up - idea.votes_down),
          description: idea.description?.slice(0, 200),
          createdAt: idea.created_at?.toISOString(),
          tags: Array.isArray(idea.tags) ? idea.tags : [],
        });
      }
    } catch (err) {
      console.log("[GRAPH_API] brain_business_ideas table not available");
    }

    // Fetch agent interactions for additional nodes
    try {
      const agentMessages = await db.execute(sql`
        SELECT
          agent_id,
          COUNT(*) as message_count
        FROM agent_messages
        WHERE user_id = ${userId}
        GROUP BY agent_id
        HAVING COUNT(*) > 5
      `);

      const agentRows = agentMessages as unknown as Array<{
        agent_id: string;
        message_count: number;
      }>;

      for (const agent of agentRows) {
        nodes.push({
          id: `agent-${agent.agent_id}`,
          label: capitalizeFirst(agent.agent_id),
          type: "agent",
          connections: Number(agent.message_count),
          description: `Frequent agent interaction (${agent.message_count} messages)`,
        });
      }
    } catch (err) {
      console.log("[GRAPH_API] agent_messages table not available");
    }

    // Generate edges based on content similarity (simplified)
    const nodeIds = nodes.map((n) => n.id);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const similarity = calculateSimilarity(nodes[i], nodes[j]);
        if (similarity > 0.3) {
          edges.push({
            source: nodes[i].id,
            target: nodes[j].id,
            strength: similarity,
            type: "similarity",
          });

          // Update connection counts
          nodes[i].connections++;
          nodes[j].connections++;
        }
      }
    }

    // Add temporal edges (items created close together)
    const sortedByDate = [...nodes].filter((n) => n.createdAt).sort(
      (a, b) =>
        new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
    );

    for (let i = 0; i < sortedByDate.length - 1; i++) {
      const current = sortedByDate[i];
      const next = sortedByDate[i + 1];

      const timeDiff = Math.abs(
        new Date(current.createdAt!).getTime() -
          new Date(next.createdAt!).getTime()
      );
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        // Created within 24 hours
        const existingEdge = edges.find(
          (e) =>
            (e.source === current.id && e.target === next.id) ||
            (e.source === next.id && e.target === current.id)
        );

        if (!existingEdge) {
          edges.push({
            source: current.id,
            target: next.id,
            strength: 0.4,
            type: "temporal",
          });
        }
      }
    }

    // If no nodes from DB, return demo data
    if (nodes.length === 0) {
      return NextResponse.json({
        success: true,
        nodes: generateDemoNodes(),
        edges: generateDemoEdges(),
        demo: true,
      });
    }

    return NextResponse.json({
      success: true,
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        avgConnections:
          nodes.reduce((sum, n) => sum + n.connections, 0) / nodes.length,
      },
    });
  } catch (error) {
    console.error("[KNOWLEDGE_GRAPH_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch graph data" },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function categorizeContent(
  source?: string,
  content?: string
): GraphNode["type"] {
  if (source?.includes("upload") || source?.includes("document")) {
    return "document";
  }
  if (content?.includes("?") || source?.includes("question")) {
    return "question";
  }
  if (source?.includes("idea") || content?.toLowerCase().includes("idea")) {
    return "idea";
  }
  return "memory";
}

function calculateSimilarity(nodeA: GraphNode, nodeB: GraphNode): number {
  let score = 0;

  // Same type bonus
  if (nodeA.type === nodeB.type) {
    score += 0.2;
  }

  // Tag overlap
  const tagsA = new Set(nodeA.tags || []);
  const tagsB = new Set(nodeB.tags || []);
  const intersection = [...tagsA].filter((tag) => tagsB.has(tag));
  if (intersection.length > 0) {
    score += 0.3 * (intersection.length / Math.max(tagsA.size, tagsB.size, 1));
  }

  // Label word overlap
  const wordsA = new Set(nodeA.label.toLowerCase().split(/\s+/));
  const wordsB = new Set(nodeB.label.toLowerCase().split(/\s+/));
  const wordIntersection = [...wordsA].filter((w) => wordsB.has(w) && w.length > 3);
  if (wordIntersection.length > 0) {
    score += 0.3;
  }

  // Description similarity (simplified)
  if (nodeA.description && nodeB.description) {
    const descWordsA = new Set(
      nodeA.description.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
    );
    const descWordsB = new Set(
      nodeB.description.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
    );
    const descIntersection = [...descWordsA].filter((w) => descWordsB.has(w));
    if (descIntersection.length >= 3) {
      score += 0.2;
    }
  }

  return Math.min(score, 1);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateDemoNodes(): GraphNode[] {
  return [
    {
      id: "1",
      label: "Sales Strategy",
      type: "memory",
      connections: 5,
      description: "Q4 Sales-Strategie und Zielsetzung für das kommende Quartal.",
      tags: ["sales", "strategy", "q4"],
    },
    {
      id: "2",
      label: "Q4 Report.pdf",
      type: "document",
      connections: 3,
      description: "Quartalsbericht mit Kennzahlen und Analysen.",
      tags: ["report", "q4", "finance"],
    },
    {
      id: "3",
      label: "Workflow Automation",
      type: "idea",
      connections: 4,
      description: "Idee zur Automatisierung wiederkehrender Prozesse.",
      tags: ["automation", "workflow", "efficiency"],
    },
    {
      id: "4",
      label: "Customer Insights",
      type: "memory",
      connections: 6,
      description: "Erkenntnisse aus Kundengesprächen und Feedback.",
      tags: ["customer", "insights", "feedback"],
    },
    {
      id: "5",
      label: "Data Analysis",
      type: "question",
      connections: 2,
      description: "Offene Frage zur Datenanalyse-Strategie.",
      tags: ["data", "analysis", "question"],
    },
    {
      id: "6",
      label: "Marketing Plan",
      type: "document",
      connections: 4,
      description: "Marketing-Strategie 2025.",
      tags: ["marketing", "strategy", "2025"],
    },
    {
      id: "7",
      label: "Product Roadmap",
      type: "idea",
      connections: 7,
      description: "Produkt-Entwicklungsplan.",
      tags: ["product", "roadmap", "development"],
    },
    {
      id: "8",
      label: "Competitor Analysis",
      type: "memory",
      connections: 3,
      description: "Wettbewerbsanalyse.",
      tags: ["competitor", "analysis", "market"],
    },
  ];
}

function generateDemoEdges(): GraphEdge[] {
  return [
    { source: "1", target: "2", strength: 0.8, type: "reference" },
    { source: "1", target: "4", strength: 0.6, type: "similarity" },
    { source: "2", target: "5", strength: 0.5, type: "reference" },
    { source: "3", target: "4", strength: 0.7, type: "similarity" },
    { source: "4", target: "5", strength: 0.4, type: "temporal" },
    { source: "6", target: "1", strength: 0.6, type: "similarity" },
    { source: "7", target: "3", strength: 0.8, type: "reference" },
    { source: "8", target: "6", strength: 0.5, type: "similarity" },
    { source: "7", target: "2", strength: 0.4, type: "temporal" },
  ];
}
