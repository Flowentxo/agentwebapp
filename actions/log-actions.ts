"use server";

// ============================================================================
// LEVEL 14: ACTIVITY LOG SERVER ACTIONS
// Manage activity logs and dashboard metrics
// ============================================================================

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import type { LogEntryType, LogEntryStatus } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export interface LogOutput {
  type: "text" | "json" | "report" | "code";
  title?: string;
  content: string;
  downloadable?: boolean;
  filename?: string;
}

export interface ToolInvocationData {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "partial-call" | "call" | "result";
  result?: unknown;
}

export interface CreateLogInput {
  type?: LogEntryType;
  status?: LogEntryStatus;
  message: string;
  agentId?: string;
  agentName?: string;
  agentColor?: string;
  duration?: number;
  tokensUsed?: number;
  cost?: number;
  output?: LogOutput;
  toolInvocations?: ToolInvocationData[];
  parentId?: string;
  originalCommand?: string;
  threadDepth?: number;
  metadata?: Record<string, unknown>;
}

export interface ActivityLogWithAgent {
  id: string;
  userId: string;
  type: LogEntryType;
  status: LogEntryStatus;
  message: string;
  agentId: string | null;
  agentName: string | null;
  agentColor: string | null;
  duration: number | null;
  tokensUsed: number | null;
  cost: number | null;
  output: LogOutput | null;
  toolInvocations: ToolInvocationData[] | null;
  parentId: string | null;
  originalCommand: string | null;
  threadDepth: number;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
}

// ============================================================================
// HELPER: Get authenticated user ID
// ============================================================================

async function getAuthUserId(): Promise<string> {
  const session = await getSession();

  if (!session || !session.user?.id) {
    throw new Error("Unauthorized: Please sign in to access this resource");
  }

  return session.user.id;
}

// ============================================================================
// GET ACTIVITY LOGS (paginated)
// ============================================================================

export async function getActivityLogs(
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: ActivityLogWithAgent[]; total: number }> {
  const userId = await getAuthUserId();

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.activityLog.count({ where: { userId } }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      output: log.output as LogOutput | null,
      toolInvocations: log.toolInvocations as ToolInvocationData[] | null,
      metadata: log.metadata as Record<string, unknown> | null,
    })),
    total,
  };
}

// ============================================================================
// GET THREAD LOGS (for conversation threads)
// ============================================================================

export async function getThreadLogs(parentId: string): Promise<ActivityLogWithAgent[]> {
  const userId = await getAuthUserId();

  const logs = await prisma.activityLog.findMany({
    where: {
      userId,
      OR: [
        { id: parentId },
        { parentId },
      ],
    },
    orderBy: { timestamp: "asc" },
  });

  return logs.map((log) => ({
    ...log,
    output: log.output as LogOutput | null,
    toolInvocations: log.toolInvocations as ToolInvocationData[] | null,
    metadata: log.metadata as Record<string, unknown> | null,
  }));
}

// ============================================================================
// CREATE ACTIVITY LOG
// ============================================================================

export async function createActivityLog(
  input: CreateLogInput
): Promise<ActivityLogWithAgent> {
  const userId = await getAuthUserId();

  const log = await prisma.activityLog.create({
    data: {
      userId,
      type: input.type || "INFO",
      status: input.status || "COMPLETED",
      message: input.message,
      agentId: input.agentId,
      agentName: input.agentName,
      agentColor: input.agentColor,
      duration: input.duration,
      tokensUsed: input.tokensUsed,
      cost: input.cost,
      output: input.output || undefined,
      toolInvocations: input.toolInvocations || undefined,
      parentId: input.parentId,
      originalCommand: input.originalCommand,
      threadDepth: input.threadDepth || 0,
      metadata: input.metadata || undefined,
    },
  });

  revalidatePath("/dashboard");

  return {
    ...log,
    output: log.output as LogOutput | null,
    toolInvocations: log.toolInvocations as ToolInvocationData[] | null,
    metadata: log.metadata as Record<string, unknown> | null,
  };
}

// ============================================================================
// UPDATE LOG STATUS
// ============================================================================

export async function updateLogStatus(
  id: string,
  status: LogEntryStatus,
  updates?: {
    duration?: number;
    tokensUsed?: number;
    cost?: number;
    output?: LogOutput;
    toolInvocations?: ToolInvocationData[];
  }
): Promise<ActivityLogWithAgent> {
  const userId = await getAuthUserId();

  // Verify ownership
  const existing = await prisma.activityLog.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Log not found or access denied");
  }

  const log = await prisma.activityLog.update({
    where: { id },
    data: {
      status,
      ...(updates?.duration !== undefined && { duration: updates.duration }),
      ...(updates?.tokensUsed !== undefined && { tokensUsed: updates.tokensUsed }),
      ...(updates?.cost !== undefined && { cost: updates.cost }),
      ...(updates?.output && { output: updates.output }),
      ...(updates?.toolInvocations && { toolInvocations: updates.toolInvocations }),
    },
  });

  revalidatePath("/dashboard");

  return {
    ...log,
    output: log.output as LogOutput | null,
    toolInvocations: log.toolInvocations as ToolInvocationData[] | null,
    metadata: log.metadata as Record<string, unknown> | null,
  };
}

// ============================================================================
// DELETE OLD LOGS (cleanup)
// ============================================================================

export async function deleteOldLogs(daysOld: number = 30): Promise<{ deleted: number }> {
  const userId = await getAuthUserId();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.activityLog.deleteMany({
    where: {
      userId,
      timestamp: { lt: cutoffDate },
    },
  });

  revalidatePath("/dashboard");

  return { deleted: result.count };
}

// ============================================================================
// GET DASHBOARD METRICS
// ============================================================================

export async function getDashboardMetrics(): Promise<{
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  successRate: number;
  activeAgents: number;
  recentLogs: ActivityLogWithAgent[];
}> {
  const userId = await getAuthUserId();

  // Get 24-hour window
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const [agents, logs, recentLogs] = await Promise.all([
    prisma.agent.findMany({
      where: { userId },
      select: {
        status: true,
        tokensUsed24h: true,
        costToday: true,
        requests24h: true,
        successRate24h: true,
      },
    }),
    prisma.activityLog.aggregate({
      where: {
        userId,
        timestamp: { gte: oneDayAgo },
      },
      _sum: {
        tokensUsed: true,
        cost: true,
      },
      _count: true,
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 10,
    }),
  ]);

  const totalTokens = agents.reduce((sum, a) => sum + a.tokensUsed24h, 0);
  const totalCost = agents.reduce((sum, a) => sum + a.costToday, 0);
  const totalRequests = agents.reduce((sum, a) => sum + a.requests24h, 0);
  const avgSuccessRate =
    agents.length > 0
      ? agents.reduce((sum, a) => sum + a.successRate24h, 0) / agents.length
      : 100;
  const activeAgents = agents.filter((a) => a.status === "WORKING").length;

  return {
    totalTokens,
    totalCost,
    totalRequests,
    successRate: Math.round(avgSuccessRate * 10) / 10,
    activeAgents,
    recentLogs: recentLogs.map((log) => ({
      ...log,
      output: log.output as LogOutput | null,
      toolInvocations: log.toolInvocations as ToolInvocationData[] | null,
      metadata: log.metadata as Record<string, unknown> | null,
    })),
  };
}
