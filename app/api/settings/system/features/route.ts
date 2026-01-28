/**
 * Feature Flags API
 *
 * Manage feature toggles and experiments:
 * - Core features
 * - Beta features
 * - A/B tests
 * - Limits & quotas
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  category: "core" | "beta" | "experiment" | "limit";
  enabled: boolean;
  value?: string | number | boolean;
  rolloutPercentage?: number;
  enabledFor?: string[]; // User IDs
  metadata?: Record<string, unknown>;
}

// Default feature flags - in production, store in database
const DEFAULT_FEATURES: FeatureFlag[] = [
  // Core Features
  {
    id: "agent-streaming",
    name: "Agent Streaming",
    description: "Echtzeit-Streaming für Agent-Antworten",
    category: "core",
    enabled: true,
  },
  {
    id: "knowledge-rag",
    name: "Knowledge Base RAG",
    description: "Retrieval Augmented Generation für Wissensdatenbank",
    category: "core",
    enabled: true,
  },
  {
    id: "workflow-automation",
    name: "Workflow Automation",
    description: "Automatisierte Workflows und Trigger",
    category: "core",
    enabled: true,
  },
  {
    id: "real-time-collaboration",
    name: "Echtzeit-Kollaboration",
    description: "Multi-User Echtzeit-Zusammenarbeit",
    category: "core",
    enabled: false,
  },

  // Beta Features
  {
    id: "advanced-analytics",
    name: "Erweiterte Analytics",
    description: "Detaillierte Nutzungsstatistiken und Insights",
    category: "beta",
    enabled: false,
    rolloutPercentage: 25,
  },
  {
    id: "ai-suggestions",
    name: "AI-Vorschläge",
    description: "Intelligente Vorschläge basierend auf Kontext",
    category: "beta",
    enabled: false,
    rolloutPercentage: 10,
  },
  {
    id: "custom-agents",
    name: "Custom Agents",
    description: "Eigene AI-Agents erstellen und trainieren",
    category: "beta",
    enabled: true,
    rolloutPercentage: 50,
  },
  {
    id: "voice-input",
    name: "Spracheingabe",
    description: "Sprachbefehle für Agents",
    category: "beta",
    enabled: false,
    rolloutPercentage: 5,
  },

  // Experiments
  {
    id: "new-chat-ui",
    name: "Neues Chat-UI",
    description: "Experimentelles Chat-Interface Design",
    category: "experiment",
    enabled: false,
    rolloutPercentage: 15,
  },
  {
    id: "smart-context",
    name: "Smart Context",
    description: "Automatische Kontext-Erkennung",
    category: "experiment",
    enabled: false,
    rolloutPercentage: 20,
  },

  // Limits & Quotas
  {
    id: "max-agents",
    name: "Max. Agents",
    description: "Maximale Anzahl an Agents",
    category: "limit",
    enabled: true,
    value: 10,
  },
  {
    id: "max-workflows",
    name: "Max. Workflows",
    description: "Maximale Anzahl an Workflows",
    category: "limit",
    enabled: true,
    value: 25,
  },
  {
    id: "max-api-calls",
    name: "Max. API Calls/Tag",
    description: "Maximale API-Aufrufe pro Tag",
    category: "limit",
    enabled: true,
    value: 10000,
  },
  {
    id: "storage-limit",
    name: "Storage Limit (GB)",
    description: "Maximaler Speicherplatz",
    category: "limit",
    enabled: true,
    value: 5,
  },
  {
    id: "ai-token-budget",
    name: "AI Token Budget/Monat",
    description: "Monatliches Token-Budget für AI",
    category: "limit",
    enabled: true,
    value: 100000,
  },
];

// In-memory store (replace with database in production)
let featureFlags = [...DEFAULT_FEATURES];

async function getAuthenticatedUser(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;

  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has access to a feature
 */
function userHasFeature(feature: FeatureFlag, userId?: string): boolean {
  if (!feature.enabled) return false;

  // Check rollout percentage
  if (feature.rolloutPercentage !== undefined && feature.rolloutPercentage < 100) {
    if (!userId) return false;
    // Deterministic hash based on user ID and feature ID
    const hash = hashCode(`${userId}-${feature.id}`);
    const bucket = Math.abs(hash) % 100;
    return bucket < feature.rolloutPercentage;
  }

  // Check specific user list
  if (feature.enabledFor && feature.enabledFor.length > 0) {
    return userId ? feature.enabledFor.includes(userId) : false;
  }

  return true;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * GET - List all feature flags
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const includeDisabled = searchParams.get("includeDisabled") === "true";

    let flags = featureFlags;

    // Filter by category
    if (category) {
      flags = flags.filter((f) => f.category === category);
    }

    // Filter disabled if requested
    if (!includeDisabled) {
      flags = flags.map((f) => ({
        ...f,
        userEnabled: userHasFeature(f, user?.id),
      }));
    }

    // Group by category
    const grouped = {
      core: flags.filter((f) => f.category === "core"),
      beta: flags.filter((f) => f.category === "beta"),
      experiment: flags.filter((f) => f.category === "experiment"),
      limit: flags.filter((f) => f.category === "limit"),
    };

    return NextResponse.json({
      features: flags,
      grouped,
      count: flags.length,
    });
  } catch (error) {
    console.error("[FEATURES_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get features" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update feature flag
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, enabled, value, rolloutPercentage } = body;

    const featureIndex = featureFlags.findIndex((f) => f.id === id);

    if (featureIndex === -1) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 404 }
      );
    }

    // Update feature
    featureFlags[featureIndex] = {
      ...featureFlags[featureIndex],
      ...(enabled !== undefined && { enabled }),
      ...(value !== undefined && { value }),
      ...(rolloutPercentage !== undefined && { rolloutPercentage }),
    };

    return NextResponse.json({
      success: true,
      feature: featureFlags[featureIndex],
    });
  } catch (error) {
    console.error("[FEATURES_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update feature" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Toggle single feature (backward compatibility)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { featureId, enabled } = body;

    const featureIndex = featureFlags.findIndex((f) => f.id === featureId);

    if (featureIndex === -1) {
      return NextResponse.json(
        { error: "Feature not found" },
        { status: 404 }
      );
    }

    featureFlags[featureIndex].enabled = enabled;

    return NextResponse.json({
      success: true,
      message: `Feature ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("Failed to toggle feature:", error);
    return NextResponse.json(
      { error: "Failed to toggle feature" },
      { status: 500 }
    );
  }
}

/**
 * POST - Check feature access for current user
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();
    const { featureId, featureIds } = body;

    // Single feature check
    if (featureId) {
      const feature = featureFlags.find((f) => f.id === featureId);

      if (!feature) {
        return NextResponse.json({ enabled: false, exists: false });
      }

      return NextResponse.json({
        enabled: userHasFeature(feature, user?.id),
        exists: true,
        feature: {
          id: feature.id,
          name: feature.name,
          category: feature.category,
        },
      });
    }

    // Multiple feature check
    if (featureIds && Array.isArray(featureIds)) {
      const results: Record<string, boolean> = {};

      for (const id of featureIds) {
        const feature = featureFlags.find((f) => f.id === id);
        results[id] = feature ? userHasFeature(feature, user?.id) : false;
      }

      return NextResponse.json({ features: results });
    }

    return NextResponse.json(
      { error: "featureId or featureIds required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[FEATURES_CHECK_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to check feature" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Reset features to defaults
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reset to defaults
    featureFlags = [...DEFAULT_FEATURES];

    return NextResponse.json({
      success: true,
      message: "Features reset to defaults",
      count: featureFlags.length,
    });
  } catch (error) {
    console.error("[FEATURES_RESET_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to reset features" },
      { status: 500 }
    );
  }
}
