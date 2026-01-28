/**
 * REVOLUTION API - AGENT CREATION
 *
 * Handles agent creation from the Revolution wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { customAgents } from '@/lib/db/schema-custom-agents';
import { canCreateAgent, incrementAgentCount, getUserSubscription } from '@/lib/services/subscription-service';
import { checkRateLimit, addRateLimitHeaders } from '@/lib/middleware/rate-limiter';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getSession } from '@/lib/auth/session';

// Validation Schema
const createAgentSchema = z.object({
  // Step 1: Agent Type & Industry
  agentType: z.enum(['sales', 'support', 'operations', 'marketing', 'hr', 'finance']),
  industries: z.array(z.string()).min(1, 'At least one industry is required'),

  // Step 2: Use Cases
  useCases: z.array(z.string()).min(1, 'At least one use case is required'),

  // Step 3: Integrations
  integrations: z.array(z.string()),

  // Step 4: Configuration
  agentName: z.string().min(3, 'Agent name must be at least 3 characters'),
  tone: z.enum(['professional', 'friendly', 'technical', 'casual']),
  languages: z.array(z.string()).default(['Deutsch']),
  responseStyle: z.enum(['quick', 'detailed']),

  // User context
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
});

type CreateAgentRequest = z.infer<typeof createAgentSchema>;

export const dynamic = 'force-dynamic';

async function resolveUserId(req: NextRequest): Promise<string> {
  // Prefer authenticated session
  try {
    const session = await getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (error) {
    console.warn('[REVOLUTION] Failed to read session user, falling back to header/demo', error);
  }

  // Allow overriding via header (e.g., internal/testing)
  const headerUser = req.headers.get('x-user-id');
  if (headerUser) return headerUser;

  // Final fallback for dev/demo
  return 'demo-user';
}

/**
 * GET /api/revolution/agents
 *
 * Returns all agents created by the user
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await resolveUserId(req);

    // Check rate limit
    const rateLimitResult = await checkRateLimit(userId, '/api/revolution/agents');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You have exceeded your rate limit. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          limit: rateLimitResult.limit,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
            'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
          },
        }
      );
    }

    const db = getDb();

    // Fetch user's agents
    const agents = await db
      .select()
      .from(customAgents)
      .where(eq(customAgents.createdBy, userId))
      .orderBy(desc(customAgents.createdAt));

    // Get subscription info
    const subscription = await getUserSubscription(userId);

    return NextResponse.json({
      success: true,
      count: agents.length,
      agents,
      subscription: subscription
        ? {
            plan: subscription.plan,
            agentLimit: subscription.agentLimit,
            agentsCreated: subscription.agentsCreated,
            remainingAgents: subscription.remainingAgents,
            canCreateAgent: subscription.canCreateAgent,
          }
        : null,
    });
  } catch (error: any) {
    console.error('[REVOLUTION_AGENTS_GET]', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch agents',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/revolution/agents
 *
 * Creates a new agent from the Revolution wizard
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Get user ID from headers (fallback to demo-user)
    const userId = await resolveUserId(req);
    const workspaceId = req.headers.get('x-workspace-id') || undefined;

    // Check subscription limits
    const canCreate = await canCreateAgent(userId);
    if (!canCreate.allowed) {
      return NextResponse.json(
        {
          error: 'Agent limit reached',
          message: canCreate.reason,
        },
        { status: 403 }
      );
    }

    // Validate input
    const validation = createAgentSchema.safeParse({
      ...body,
      userId,
      workspaceId,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Generate system instructions based on agent type and use cases
    const systemInstructions = generateSystemInstructions(data);

    // Determine icon and color based on agent type
    const agentVisuals = getAgentVisuals(data.agentType);

    // Determine AI model based on response style
    const model = data.responseStyle === 'quick' ? 'gpt-4o-mini' : 'gpt-4o';

    // Build agent metadata
    const agentMetadata = {
      agentType: data.agentType,
      industries: data.industries,
      useCases: data.useCases,
      integrations: data.integrations,
      tone: data.tone,
      languages: data.languages,
      responseStyle: data.responseStyle,
    };

    // Insert into database
    const db = getDb();
    const [createdAgent] = await db
      .insert(customAgents)
      .values({
        name: data.agentName,
        description: generateAgentDescription(data),
        icon: agentVisuals.icon,
        color: agentVisuals.color,
        systemInstructions,
        model,
        temperature: '0.7',
        maxTokens: data.responseStyle === 'quick' ? '1000' : '4000',
        conversationStarters: generateConversationStarters(data),
        capabilities: {
          webBrowsing: data.useCases.includes('web-search') || data.useCases.includes('competitor-analysis'),
          codeInterpreter: data.agentType === 'operations' || data.agentType === 'finance',
          imageGeneration: data.agentType === 'marketing',
          knowledgeBase: true,
          customActions: data.integrations.length > 0,
        },
        visibility: 'private',
        status: 'active',
        createdBy: userId,
        workspaceId: workspaceId || null,
        tags: generateTags(data),
        usageCount: '0',
      })
      .returning();

    console.log(`[REVOLUTION_API] Created agent: ${createdAgent.id} - ${createdAgent.name}`);

    // Update subscription agent count
    await incrementAgentCount(userId);

    return NextResponse.json({
      success: true,
      agent: {
        id: createdAgent.id,
        name: createdAgent.name,
        description: createdAgent.description,
        icon: createdAgent.icon,
        color: createdAgent.color,
        type: 'standard',
        industry: data.industries.join(', '),
        capabilities: createdAgent.capabilities,
        metadata: agentMetadata,
      },
    });
  } catch (error: any) {
    console.error('[REVOLUTION_API] Error creating agent:', error);
    return NextResponse.json(
      {
        error: 'Failed to create agent',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generates system instructions based on agent configuration
 */
function generateSystemInstructions(data: CreateAgentRequest): string {
  const agentTypeDescriptions: Record<string, string> = {
    sales: 'Du bist ein erfahrener Sales Agent, spezialisiert auf Lead-Qualifizierung und Vertrieb.',
    support: 'Du bist ein freundlicher und hilfsbereiter Customer Support Agent.',
    operations: 'Du bist ein effizienter Operations Agent, der Prozesse automatisiert und optimiert.',
    marketing: 'Du bist ein kreativer Marketing Agent, der Content erstellt und Kampagnen plant.',
    hr: 'Du bist ein professioneller HR Agent, der bei Recruiting und Personalthemen unterstützt.',
    finance: 'Du bist ein präziser Finance Agent, der bei Finanzthemen und Buchhaltung hilft.',
  };

  const toneDescriptions: Record<string, string> = {
    professional: 'Verwende eine professionelle und formelle Sprache.',
    friendly: 'Sei freundlich, warm und persönlich in deiner Kommunikation.',
    technical: 'Nutze fachspezifische Terminologie und sei präzise.',
    casual: 'Kommuniziere locker und modern, aber respektvoll.',
  };

  const responseStyleDescriptions: Record<string, string> = {
    quick: 'Halte deine Antworten kurz und präzise (1-2 Sätze).',
    detailed: 'Gib ausführliche und umfassende Antworten (3-5 Absätze).',
  };

  // Build industry context
  const industryContext =
    data.industries.length > 0
      ? `\nDu bist spezialisiert auf folgende Branchen: ${data.industries.join(', ')}.`
      : '';

  // Build use case context
  const useCaseContext =
    data.useCases.length > 0
      ? `\n\nDeine Hauptaufgaben sind:\n${data.useCases.map((uc) => `- ${uc}`).join('\n')}`
      : '';

  return `${agentTypeDescriptions[data.agentType]}${industryContext}

${toneDescriptions[data.tone]}
${responseStyleDescriptions[data.responseStyle]}
${useCaseContext}

Antworte immer in folgenden Sprachen: ${data.languages.join(', ')}.

Wenn du auf Daten oder Integrationen zugreifen musst, verwende die verfügbaren Tools:
${data.integrations.map((int) => `- ${int}`).join('\n')}`;
}

/**
 * Generates a concise description for the agent
 */
function generateAgentDescription(data: CreateAgentRequest): string {
  const agentTypeLabels: Record<string, string> = {
    sales: 'Vertrieb & Akquise',
    support: 'Kundensupport',
    operations: 'Betrieb & Prozesse',
    marketing: 'Marketing & Content',
    hr: 'HR & Recruiting',
    finance: 'Finanzen & Controlling',
  };

  return `${agentTypeLabels[data.agentType]} Agent für ${data.industries.join(', ')}. Spezialisiert auf: ${data.useCases.slice(0, 3).join(', ')}.`;
}

/**
 * Determines icon and color based on agent type
 */
function getAgentVisuals(agentType: string): { icon: string; color: string } {
  const visuals: Record<string, { icon: string; color: string }> = {
    sales: { icon: '🎯', color: '#ec4899' },
    support: { icon: '💬', color: '#3b82f6' },
    operations: { icon: '⚙️', color: '#8b5cf6' },
    marketing: { icon: '📣', color: '#f59e0b' },
    hr: { icon: '👥', color: '#a855f7' },
    finance: { icon: '💰', color: '#10b981' },
  };

  return visuals[agentType] || { icon: '🤖', color: '#06b6d4' };
}

/**
 * Generates conversation starters based on agent type
 */
function generateConversationStarters(data: CreateAgentRequest): string[] {
  const starters: Record<string, string[]> = {
    sales: [
      'Wie kann ich diesen Lead qualifizieren?',
      'Erstelle eine Follow-up-E-Mail für...',
      'Analysiere dieses Unternehmen',
      'Wann ist der beste Zeitpunkt für ein Meeting?',
    ],
    support: [
      'Wie beantworte ich diese Kundenanfrage?',
      'Erstelle ein Ticket für...',
      'Wo finde ich Informationen zu...?',
      'Wie eskaliere ich diesen Fall?',
    ],
    operations: [
      'Automatisiere diesen Workflow:',
      'Erstelle einen Report über...',
      'Synchronisiere Daten zwischen...',
      'Prüfe die Datenqualität von...',
    ],
    marketing: [
      'Schreibe einen Social-Media-Post über...',
      'Erstelle Content-Ideen für...',
      'Analysiere diese Kampagne',
      'Optimiere diesen Text für SEO',
    ],
    hr: [
      'Bewerte diesen Lebenslauf',
      'Plane ein Interview mit...',
      'Erstelle einen Onboarding-Plan',
      'Beantworte diese HR-Frage:',
    ],
    finance: [
      'Prüfe diese Rechnung',
      'Erstelle eine Zahlungserinnerung',
      'Analysiere diese Ausgaben',
      'Erstelle einen Finanzreport',
    ],
  };

  return starters[data.agentType] || ['Wie kann ich dir helfen?'];
}

/**
 * Generates tags for the agent
 */
function generateTags(data: CreateAgentRequest): string[] {
  const tags: string[] = [data.agentType];

  // Add industries
  tags.push(...data.industries);

  // Add tone
  tags.push(data.tone);

  // Add a few use cases as tags
  tags.push(...data.useCases.slice(0, 3));

  return tags;
}
