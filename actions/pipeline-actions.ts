"use server";

// ============================================================================
// LEVEL 14: PIPELINE SERVER ACTIONS
// Secure CRUD operations for automation pipelines
// ============================================================================

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import type { PipelineTriggerType, PipelineStatus, StepStatus } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineStepInput {
  agentId: string;
  instruction: string;
}

export interface CreatePipelineInput {
  name: string;
  description?: string;
  triggerType?: PipelineTriggerType;
  steps?: PipelineStepInput[];
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string;
  triggerType?: PipelineTriggerType;
  isActive?: boolean;
}

export interface PipelineWithSteps {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  triggerType: PipelineTriggerType;
  isActive: boolean;
  status: PipelineStatus;
  runCount: number;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  steps: {
    id: string;
    agentId: string;
    instruction: string;
    order: number;
    status: StepStatus;
    result: string | null;
    error: string | null;
    tokensUsed: number | null;
  }[];
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
// GET ALL PIPELINES
// ============================================================================

export async function getPipelines(): Promise<PipelineWithSteps[]> {
  const userId = await getAuthUserId();

  const pipelines = await prisma.pipeline.findMany({
    where: { userId },
    include: {
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          agentId: true,
          instruction: true,
          order: true,
          status: true,
          result: true,
          error: true,
          tokensUsed: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pipelines;
}

// ============================================================================
// GET SINGLE PIPELINE
// ============================================================================

export async function getPipeline(id: string): Promise<PipelineWithSteps | null> {
  const userId = await getAuthUserId();

  const pipeline = await prisma.pipeline.findFirst({
    where: { id, userId },
    include: {
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          agentId: true,
          instruction: true,
          order: true,
          status: true,
          result: true,
          error: true,
          tokensUsed: true,
        },
      },
    },
  });

  return pipeline;
}

// ============================================================================
// CREATE PIPELINE
// ============================================================================

export async function createPipeline(input: CreatePipelineInput): Promise<PipelineWithSteps> {
  const userId = await getAuthUserId();

  // Verify all agent IDs belong to user
  if (input.steps && input.steps.length > 0) {
    const agentIds = input.steps.map((s) => s.agentId);
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds }, userId },
      select: { id: true },
    });

    const validIds = new Set(agents.map((a) => a.id));
    const invalidIds = agentIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      throw new Error(`Invalid agent IDs: ${invalidIds.join(", ")}`);
    }
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      triggerType: input.triggerType || "MANUAL",
      steps: {
        create:
          input.steps?.map((step, index) => ({
            agentId: step.agentId,
            instruction: step.instruction,
            order: index,
          })) || [],
      },
    },
    include: {
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          agentId: true,
          instruction: true,
          order: true,
          status: true,
          result: true,
          error: true,
          tokensUsed: true,
        },
      },
    },
  });

  revalidatePath("/pipelines");
  revalidatePath("/dashboard");

  return pipeline;
}

// ============================================================================
// UPDATE PIPELINE
// ============================================================================

export async function updatePipeline(
  id: string,
  input: UpdatePipelineInput
): Promise<PipelineWithSteps> {
  const userId = await getAuthUserId();

  // Verify ownership
  const existing = await prisma.pipeline.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Pipeline not found or access denied");
  }

  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.triggerType && { triggerType: input.triggerType }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    include: {
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          agentId: true,
          instruction: true,
          order: true,
          status: true,
          result: true,
          error: true,
          tokensUsed: true,
        },
      },
    },
  });

  revalidatePath("/pipelines");
  revalidatePath(`/pipelines/${id}`);

  return pipeline;
}

// ============================================================================
// DELETE PIPELINE
// ============================================================================

export async function deletePipeline(id: string): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  const existing = await prisma.pipeline.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Pipeline not found or access denied");
  }

  await prisma.pipeline.delete({
    where: { id },
  });

  revalidatePath("/pipelines");
  revalidatePath("/dashboard");

  return { success: true };
}

// ============================================================================
// ADD STEP TO PIPELINE
// ============================================================================

export async function addPipelineStep(
  pipelineId: string,
  step: PipelineStepInput
): Promise<PipelineWithSteps> {
  const userId = await getAuthUserId();

  // Verify pipeline ownership
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, userId },
    include: { steps: true },
  });

  if (!pipeline) {
    throw new Error("Pipeline not found or access denied");
  }

  // Verify agent ownership
  const agent = await prisma.agent.findFirst({
    where: { id: step.agentId, userId },
  });

  if (!agent) {
    throw new Error("Agent not found or access denied");
  }

  // Add step with next order number
  const maxOrder = pipeline.steps.reduce((max, s) => Math.max(max, s.order), -1);

  await prisma.pipelineStep.create({
    data: {
      pipelineId,
      agentId: step.agentId,
      instruction: step.instruction,
      order: maxOrder + 1,
    },
  });

  const updated = await getPipeline(pipelineId);
  revalidatePath(`/pipelines/${pipelineId}`);

  return updated!;
}

// ============================================================================
// REMOVE STEP FROM PIPELINE
// ============================================================================

export async function removePipelineStep(
  pipelineId: string,
  stepId: string
): Promise<PipelineWithSteps> {
  const userId = await getAuthUserId();

  // Verify pipeline ownership
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, userId },
  });

  if (!pipeline) {
    throw new Error("Pipeline not found or access denied");
  }

  // Delete the step
  await prisma.pipelineStep.delete({
    where: { id: stepId },
  });

  // Reorder remaining steps
  const remainingSteps = await prisma.pipelineStep.findMany({
    where: { pipelineId },
    orderBy: { order: "asc" },
  });

  for (let i = 0; i < remainingSteps.length; i++) {
    await prisma.pipelineStep.update({
      where: { id: remainingSteps[i].id },
      data: { order: i },
    });
  }

  const updated = await getPipeline(pipelineId);
  revalidatePath(`/pipelines/${pipelineId}`);

  return updated!;
}

// ============================================================================
// REORDER PIPELINE STEPS
// ============================================================================

export async function reorderPipelineSteps(
  pipelineId: string,
  stepIds: string[]
): Promise<PipelineWithSteps> {
  const userId = await getAuthUserId();

  // Verify pipeline ownership
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, userId },
  });

  if (!pipeline) {
    throw new Error("Pipeline not found or access denied");
  }

  // Update order for each step
  for (let i = 0; i < stepIds.length; i++) {
    await prisma.pipelineStep.update({
      where: { id: stepIds[i] },
      data: { order: i },
    });
  }

  const updated = await getPipeline(pipelineId);
  revalidatePath(`/pipelines/${pipelineId}`);

  return updated!;
}

// ============================================================================
// TOGGLE PIPELINE ACTIVE STATUS
// ============================================================================

export async function togglePipelineActive(id: string): Promise<PipelineWithSteps> {
  const userId = await getAuthUserId();

  const existing = await prisma.pipeline.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Pipeline not found or access denied");
  }

  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: { isActive: !existing.isActive },
    include: {
      steps: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          agentId: true,
          instruction: true,
          order: true,
          status: true,
          result: true,
          error: true,
          tokensUsed: true,
        },
      },
    },
  });

  revalidatePath("/pipelines");

  return pipeline;
}
