"use server";

// ============================================================================
// LEVEL 14: USER SETTINGS SERVER ACTIONS
// Manage user preferences and BYO API keys
// ============================================================================

import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";

// ============================================================================
// TYPES
// ============================================================================

export interface UserSettingsData {
  id: string;
  userId: string;
  openaiApiKey: string | null;
  resendApiKey: string | null;
  slackWebhookUrl: string | null;
  tavilyApiKey: string | null;
  theme: string;
  defaultModel: string;
  defaultTemp: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSettingsInput {
  openaiApiKey?: string | null;
  resendApiKey?: string | null;
  slackWebhookUrl?: string | null;
  tavilyApiKey?: string | null;
  theme?: string;
  defaultModel?: string;
  defaultTemp?: number;
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
// GET OR CREATE USER SETTINGS
// ============================================================================

export async function getUserSettings(): Promise<UserSettingsData> {
  const userId = await getAuthUserId();

  let settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  // Create default settings if not exists
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId },
    });
  }

  return settings;
}

// ============================================================================
// UPDATE USER SETTINGS
// ============================================================================

export async function updateUserSettings(
  input: UpdateSettingsInput
): Promise<UserSettingsData> {
  const userId = await getAuthUserId();

  // Upsert settings
  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      ...input,
    },
    update: {
      ...(input.openaiApiKey !== undefined && { openaiApiKey: input.openaiApiKey }),
      ...(input.resendApiKey !== undefined && { resendApiKey: input.resendApiKey }),
      ...(input.slackWebhookUrl !== undefined && { slackWebhookUrl: input.slackWebhookUrl }),
      ...(input.tavilyApiKey !== undefined && { tavilyApiKey: input.tavilyApiKey }),
      ...(input.theme !== undefined && { theme: input.theme }),
      ...(input.defaultModel !== undefined && { defaultModel: input.defaultModel }),
      ...(input.defaultTemp !== undefined && { defaultTemp: input.defaultTemp }),
    },
  });

  revalidatePath("/settings");

  return settings;
}

// ============================================================================
// SET OPENAI API KEY
// ============================================================================

export async function setOpenAIApiKey(apiKey: string): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  // Validate key format
  if (!apiKey.startsWith("sk-")) {
    throw new Error("Invalid OpenAI API key format. Key should start with 'sk-'");
  }

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, openaiApiKey: apiKey },
    update: { openaiApiKey: apiKey },
  });

  revalidatePath("/settings");

  return { success: true };
}

// ============================================================================
// CLEAR OPENAI API KEY
// ============================================================================

export async function clearOpenAIApiKey(): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, openaiApiKey: null },
    update: { openaiApiKey: null },
  });

  revalidatePath("/settings");

  return { success: true };
}

// ============================================================================
// SET RESEND API KEY
// ============================================================================

export async function setResendApiKey(apiKey: string): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  // Validate key format
  if (!apiKey.startsWith("re_")) {
    throw new Error("Invalid Resend API key format. Key should start with 're_'");
  }

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, resendApiKey: apiKey },
    update: { resendApiKey: apiKey },
  });

  revalidatePath("/settings");

  return { success: true };
}

// ============================================================================
// CLEAR RESEND API KEY
// ============================================================================

export async function clearResendApiKey(): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, resendApiKey: null },
    update: { resendApiKey: null },
  });

  revalidatePath("/settings");

  return { success: true };
}

// ============================================================================
// SET SLACK WEBHOOK URL
// ============================================================================

export async function setSlackWebhookUrl(url: string): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  // Validate URL format
  if (!url.startsWith("https://hooks.slack.com/services/")) {
    throw new Error("Invalid Slack webhook URL format");
  }

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, slackWebhookUrl: url },
    update: { slackWebhookUrl: url },
  });

  revalidatePath("/settings");

  return { success: true };
}

// ============================================================================
// CLEAR SLACK WEBHOOK URL
// ============================================================================

export async function clearSlackWebhookUrl(): Promise<{ success: boolean }> {
  const userId = await getAuthUserId();

  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, slackWebhookUrl: null },
    update: { slackWebhookUrl: null },
  });

  revalidatePath("/settings");

  return { success: true };
}

// ============================================================================
// CHECK API KEY STATUS (without exposing the actual keys)
// ============================================================================

export async function getApiKeyStatus(): Promise<{
  hasOpenAI: boolean;
  hasResend: boolean;
  hasSlack: boolean;
  hasTavily: boolean;
}> {
  const userId = await getAuthUserId();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      openaiApiKey: true,
      resendApiKey: true,
      slackWebhookUrl: true,
      tavilyApiKey: true,
    },
  });

  return {
    hasOpenAI: !!settings?.openaiApiKey,
    hasResend: !!settings?.resendApiKey,
    hasSlack: !!settings?.slackWebhookUrl,
    hasTavily: !!settings?.tavilyApiKey,
  };
}

// ============================================================================
// GET API KEYS FOR SERVER-SIDE USE (e.g., in API routes)
// ============================================================================

export async function getApiKeysForRequest(): Promise<{
  openaiApiKey: string | null;
  resendApiKey: string | null;
  slackWebhookUrl: string | null;
  tavilyApiKey: string | null;
}> {
  const userId = await getAuthUserId();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      openaiApiKey: true,
      resendApiKey: true,
      slackWebhookUrl: true,
      tavilyApiKey: true,
    },
  });

  return {
    openaiApiKey: settings?.openaiApiKey || null,
    resendApiKey: settings?.resendApiKey || null,
    slackWebhookUrl: settings?.slackWebhookUrl || null,
    tavilyApiKey: settings?.tavilyApiKey || null,
  };
}
