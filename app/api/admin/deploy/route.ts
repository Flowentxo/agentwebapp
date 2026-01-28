import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Mock deployment data
const MOCK_DEPLOYMENTS = [
  {
    id: "deploy-001",
    version: "v3.5.2",
    status: "success",
    environment: "production",
    deployedBy: "Max Mustermann",
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    duration: "4m 32s",
    commit: "a3b4c5d",
    commitMessage: "feat: Admin panel enhancement",
    health: {
      api: "healthy",
      database: "healthy",
      cache: "healthy",
    },
  },
  {
    id: "deploy-002",
    version: "v3.5.1",
    status: "success",
    environment: "production",
    deployedBy: "Anna Schmidt",
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    duration: "3m 54s",
    commit: "f7e8d9a",
    commitMessage: "fix: Content-Only layouts for sections",
    health: {
      api: "healthy",
      database: "healthy",
      cache: "healthy",
    },
  },
  {
    id: "deploy-003",
    version: "v3.5.0",
    status: "success",
    environment: "production",
    deployedBy: "Thomas Müller",
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
    duration: "5m 12s",
    commit: "c1d2e3f",
    commitMessage: "feat: Knowledge system implementation",
    health: {
      api: "healthy",
      database: "healthy",
      cache: "healthy",
    },
  },
  {
    id: "deploy-004",
    version: "v3.4.8",
    status: "rolled_back",
    environment: "production",
    deployedBy: "Sarah Weber",
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    duration: "4m 18s",
    commit: "g4h5i6j",
    commitMessage: "fix: Performance optimization attempt",
    health: {
      api: "degraded",
      database: "healthy",
      cache: "unhealthy",
    },
    rollbackReason: "High error rate detected",
  },
  {
    id: "deploy-005",
    version: "v3.4.7",
    status: "success",
    environment: "production",
    deployedBy: "Max Mustermann",
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
    duration: "4m 02s",
    commit: "k7l8m9n",
    commitMessage: "feat: Agent system refactoring",
    health: {
      api: "healthy",
      database: "healthy",
      cache: "healthy",
    },
  },
];

/**
 * GET /api/admin/deploy
 * Get deployment history
 */
export async function GET() {
  return NextResponse.json(
    { deployments: MOCK_DEPLOYMENTS, ts: Date.now() },
    { status: 200 }
  );
}

/**
 * POST /api/admin/deploy
 * Trigger a new deployment
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { version, environment = "production", deployedBy = "System" } = body;

    if (!version) {
      return NextResponse.json(
        { error: "Version is required" },
        { status: 400 }
      );
    }

    // Simulate deployment
    const newDeployment = {
      id: `deploy-${Date.now()}`,
      version,
      status: "in_progress" as const,
      environment,
      deployedBy,
      deployedAt: new Date().toISOString(),
      duration: "0s",
      commit: Math.random().toString(36).substring(7),
      commitMessage: "Manual deployment triggered",
      health: {
        api: "checking",
        database: "checking",
        cache: "checking",
      },
    };

    return NextResponse.json(
      { deployment: newDeployment, ts: Date.now() },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/admin/deploy/rollback
 * Rollback to a previous deployment
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { deploymentId, reason } = body;

    if (!deploymentId) {
      return NextResponse.json(
        { error: "Deployment ID is required" },
        { status: 400 }
      );
    }

    const deployment = MOCK_DEPLOYMENTS.find((d) => d.id === deploymentId);

    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 }
      );
    }

    // Simulate rollback
    const rollback = {
      id: `deploy-rollback-${Date.now()}`,
      version: deployment.version,
      status: "in_progress" as const,
      environment: deployment.environment,
      deployedBy: "System (Rollback)",
      deployedAt: new Date().toISOString(),
      duration: "0s",
      commit: deployment.commit,
      commitMessage: `Rollback to ${deployment.version}: ${reason || "Manual rollback"}`,
      health: {
        api: "checking",
        database: "checking",
        cache: "checking",
      },
    };

    return NextResponse.json(
      { deployment: rollback, ts: Date.now() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
