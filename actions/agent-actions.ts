"use server";

// ============================================================================
// LEVEL 14: AGENT SERVER ACTIONS
// Secure CRUD operations for user agents with session-based authentication
// ============================================================================

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import type { AgentWorkStatus } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export interface AgentCapabilities {
  internetAccess: boolean;
  longTermMemory: boolean;
  codeExecution: boolean;
  canSendEmail: boolean;
  canPostToSlack: boolean;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  color?: string;
  icon?: string;
  bio?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokensPerReq?: number;
  capabilities?: Partial<AgentCapabilities>;
  accessibleFiles?: string[];
}

export interface UpdateAgentInput {
  name?: string;
  role?: string;
  color?: string;
  icon?: string;
  bio?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokensPerReq?: number;
  capabilities?: Partial<AgentCapabilities>;
  status?: AgentWorkStatus;
  accessibleFiles?: string[];
}

export interface AgentWithStats {
  id: string;
  userId: string;
  name: string;
  role: string;
  color: string;
  icon: string;
  bio: string | null;
  systemPrompt: string | null;
  temperature: number;
  maxTokensPerReq: number;
  capabilities: AgentCapabilities;
  status: AgentWorkStatus;
  currentTask: string | null;
  taskStartedAt: Date | null;
  requests24h: number;
  successRate24h: number;
  avgResponseTime: number;
  tokensUsed24h: number;
  costToday: number;
  lastActivity: Date;
  accessibleFiles: string[];
  createdAt: Date;
  updatedAt: Date;
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
// GET ALL AGENTS (for current user)
// ============================================================================

export async function getAgents(): Promise<AgentWithStats[]> {
  const userId = await getAuthUserId();

  const agents = await prisma.agent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return agents.map((agent) => ({
    ...agent,
    capabilities: agent.capabilities as AgentCapabilities,
  }));
}

// ============================================================================
// GET SINGLE AGENT (with ownership check)
// ============================================================================

export async function getAgent(id: string): Promise<AgentWithStats | null> {
  const userId = await getAuthUserId();

  const agent = await prisma.agent.findFirst({
    where: { id, userId },
  });

  if (!agent) {
    return null;
  }

  return {
    ...agent,
    capabilities: agent.capabilities as AgentCapabilities,
  };
}

// ============================================================================
// CREATE AGENT
// ============================================================================

export async function createAgent(input: CreateAgentInput): Promise<AgentWithStats> {
  const userId = await getAuthUserId();

  const defaultCapabilities: AgentCapabilities = {
    internetAccess: true,
    longTermMemory: true,
    codeExecution: false,
    canSendEmail: false,
    canPostToSlack: false,
  };

  const capabilities = {
    ...defaultCapabilities,
    ...input.capabilities,
  };

  const agent = await prisma.agent.create({
    data: {
      userId,
      name: input.name,
      role: input.role,
      color: input.color || "#3B82F6",
      icon: input.icon || "bot",
      bio: input.bio,
      systemPrompt: input.systemPrompt,
      temperature: input.temperature ?? 0.7,
      maxTokensPerReq: input.maxTokensPerReq ?? 4000,
      capabilities,
      accessibleFiles: input.accessibleFiles || [],
    },
  });

  revalidatePath("/agents");
  revalidatePath("/dashboard");

  return {
    ...agent,
    capabilities: agent.capabilities as AgentCapabilities,
  };
}

// ============================================================================
// UPDATE AGENT
// ============================================================================

export async function updateAgent(
  id: string,
  input: UpdateAgentInput
): Promise<AgentWithStats> {
  const userId = await getAuthUserId();

  // Verify ownership
  const existing = await prisma.agent.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Agent not found or access denied");
  }

  // Merge capabilities if provided
  let capabilities = existing.capabilities as AgentCapabilities;
  if (input.capabilities) {
    capabilities = {
      ...capabilities,
      ...input.capabilities,
    };
  }

  const agent = await prisma.agent.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.role && { role: input.role }),
      ...(input.color && { color: input.color }),
      ...(input.icon && { icon: input.icon }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.systemPrompt !== undefined && { systemPrompt: input.systemPrompt }),
      ...(input.temperature !== undefined && { temperature: input.temperature }),
      ...(input.maxTokensPerReq !== undefined && { maxTokensPerReq: input.maxTokensPerReq }),
      ...(input.capabilities && { capabilities }),
      ...(input.status && { status: input.status }),
      ...(input.accessibleFiles && { accessibleFiles: input.accessibleFiles }),
      lastActivity: new Date(),
    },
  });

  revalidatePath("/agents");
  revalidatePath(`/agents/${id}`);
  revalidatePath("/dashboard");

  return {
    ...agent,
    capabilities: agent.capabilities as AgentCapabilities,
  };
}

// ============================================================================
// DELETE AGENT
// ============================================================================

export async function deleteAgent(id: string): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  // Verify ownership
  const existing = await prisma.agent.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Agent not found or access denied");
  }

  await prisma.agent.delete({
    where: { id },
  });

  revalidatePath("/agents");
  revalidatePath("/dashboard");

  return { success: true };
}

// ============================================================================
// UPDATE AGENT STATUS
// ============================================================================

export async function updateAgentStatus(
  id: string,
  status: AgentWorkStatus,
  currentTask?: string
): Promise<AgentWithStats> {
  const userId = await getAuthUserId();

  // Verify ownership
  const existing = await prisma.agent.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Agent not found or access denied");
  }

  const agent = await prisma.agent.update({
    where: { id },
    data: {
      status,
      currentTask: status === "WORKING" ? currentTask : null,
      taskStartedAt: status === "WORKING" ? new Date() : null,
      lastActivity: new Date(),
    },
  });

  revalidatePath("/agents");
  revalidatePath(`/agents/${id}`);

  return {
    ...agent,
    capabilities: agent.capabilities as AgentCapabilities,
  };
}

// ============================================================================
// INCREMENT AGENT METRICS (called after each interaction)
// ============================================================================

export async function incrementAgentMetrics(
  id: string,
  tokensUsed: number,
  responseTimeMs: number,
  success: boolean
): Promise<void> {
  const userId = await getAuthUserId();

  // Verify ownership
  const existing = await prisma.agent.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Agent not found or access denied");
  }

  // Calculate new averages
  const newRequests = existing.requests24h + 1;
  const newSuccessRate = success
    ? ((existing.successRate24h * existing.requests24h + 100) / newRequests)
    : ((existing.successRate24h * existing.requests24h) / newRequests);
  const newAvgResponseTime = Math.round(
    (existing.avgResponseTime * existing.requests24h + responseTimeMs) / newRequests
  );

  // Estimate cost ($0.00002 per token for GPT-4)
  const tokenCost = tokensUsed * 0.00002;

  await prisma.agent.update({
    where: { id },
    data: {
      requests24h: newRequests,
      successRate24h: Math.round(newSuccessRate * 10) / 10,
      avgResponseTime: newAvgResponseTime,
      tokensUsed24h: existing.tokensUsed24h + tokensUsed,
      costToday: existing.costToday + tokenCost,
      lastActivity: new Date(),
    },
  });
}

// ============================================================================
// RESET DAILY METRICS (called by cron job at midnight)
// ============================================================================

export async function resetDailyMetrics(): Promise<void> {
  const userId = await getAuthUserId();

  await prisma.agent.updateMany({
    where: { userId },
    data: {
      requests24h: 0,
      tokensUsed24h: 0,
      costToday: 0,
    },
  });

  revalidatePath("/agents");
  revalidatePath("/dashboard");
}
