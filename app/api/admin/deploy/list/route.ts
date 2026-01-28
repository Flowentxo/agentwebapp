import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { deployments } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { desc, eq, and } from "drizzle-orm";
import { execSync } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Format duration from milliseconds to human-readable string
 */
function formatDuration(ms: number | null): string {
  if (!ms) return "N/A";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

/**
 * Get current git info for "live" deployment status
 */
function getCurrentGitInfo(): { version: string; commit: string; branch: string } {
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

    // Try to get latest tag as version
    let version = 'dev';
    try {
      version = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    } catch {
      // No tags, use commit-based version
      version = `0.0.0-${commit}`;
    }

    return { version, commit, branch };
  } catch (error) {
    return {
      version: process.env.npm_package_version || '0.0.0',
      commit: 'unknown',
      branch: 'unknown',
    };
  }
}

/**
 * GET /api/admin/deploy/list
 * Get deployment history
 * Uses database if available, falls back to git info
 * Requires admin role
 */
export async function GET(request: Request) {
  try {
    // Require admin session
    await requireSession({ requireRoles: ['admin'] });

    const db = getDb();
    let deploymentsData: any[] = [];
    let activeDeployment: any = null;

    try {
      // Try to get deployments from database
      deploymentsData = await db
        .select()
        .from(deployments)
        .orderBy(desc(deployments.createdAt))
        .limit(20);

      // Get the active (latest successful) deployment
      const [active] = await db
        .select()
        .from(deployments)
        .where(
          and(
            eq(deployments.status, 'success'),
            eq(deployments.environment, 'production')
          )
        )
        .orderBy(desc(deployments.completedAt))
        .limit(1);

      activeDeployment = active;
    } catch (e) {
      // Table might not exist yet
      console.log('[DEPLOY_LIST] Deployments table not available, using git info');
    }

    // If no deployments in DB, create a "current" deployment from git info
    if (deploymentsData.length === 0) {
      const gitInfo = getCurrentGitInfo();
      const currentDeployment = {
        id: 'current',
        version: gitInfo.version,
        commit: gitInfo.commit,
        branch: gitInfo.branch,
        status: 'success',
        environment: 'production',
        deployedBy: 'system',
        deployedByEmail: 'system@sintra.ai',
        deployedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 'N/A',
        durationMs: null,
        healthCheckPassed: true,
        metadata: { source: 'git' },
      };

      deploymentsData = [currentDeployment];
      activeDeployment = currentDeployment;
    }

    // Transform for frontend
    const transformedDeployments = deploymentsData.map(d => ({
      id: d.id,
      version: d.version,
      commit: d.commit,
      commitMessage: d.commitMessage,
      branch: d.branch,
      status: d.status,
      environment: d.environment,
      deployedBy: d.deployedByEmail || d.deployedBy,
      deployedAt: (d.completedAt || d.startedAt || d.createdAt)?.toISOString?.() || d.deployedAt,
      duration: formatDuration(d.durationMs),
      healthCheckPassed: d.healthCheckPassed,
      metadata: d.metadata,
      rolledBackAt: d.rolledBackAt?.toISOString?.(),
      rollbackReason: d.rollbackReason,
    }));

    return NextResponse.json({
      deployments: transformedDeployments,
      active: activeDeployment ? {
        id: activeDeployment.id,
        version: activeDeployment.version,
        commit: activeDeployment.commit,
        branch: activeDeployment.branch,
        status: activeDeployment.status,
        deployedBy: activeDeployment.deployedByEmail || activeDeployment.deployedBy,
        deployedAt: (activeDeployment.completedAt || activeDeployment.createdAt)?.toISOString?.() || activeDeployment.deployedAt,
        healthCheckPassed: activeDeployment.healthCheckPassed,
      } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[DEPLOY_LIST]", error);

    if (error.code === 'SESSION_INVALID' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fallback to git info on any error
    const gitInfo = getCurrentGitInfo();
    return NextResponse.json({
      deployments: [{
        id: 'current',
        version: gitInfo.version,
        commit: gitInfo.commit,
        branch: gitInfo.branch,
        status: 'success',
        deployedBy: 'system',
        deployedAt: new Date().toISOString(),
        duration: 'N/A',
        healthCheckPassed: true,
      }],
      active: {
        id: 'current',
        version: gitInfo.version,
        commit: gitInfo.commit,
        branch: gitInfo.branch,
        status: 'success',
        deployedBy: 'system',
        healthCheckPassed: true,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
