/**
 * Public API v1 - Agents Endpoint
 *
 * Example endpoint that requires API key authentication
 *
 * GET /api/v1/agents - List all agents (requires agents:read scope)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiKeyAndRateLimit } from '@/lib/auth/api-key-middleware';
import { API_SCOPES } from '@/lib/db/schema-api-keys';
import { agentPersonas, type AgentPersona } from '@/lib/agents/personas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/agents - List all agents
 *
 * Authentication: Requires API key with agents:read scope
 * Rate limit: Per API key configuration
 */
export async function GET(req: NextRequest) {
  // Authenticate with API key and enforce rate limiting
  const authResult = await withApiKeyAndRateLimit(req, {
    requiredScopes: [API_SCOPES.AGENTS_READ],
  });

  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    // Successfully authenticated - return agents data
    const agents = agentPersonas.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      color: agent.color,
      status: agent.status,
      category: agent.category,
      specialties: agent.specialties,
      bio: agent.bio,
    }));

    return NextResponse.json(
      {
        success: true,
        data: agents,
        meta: {
          total: agents.length,
          apiKeyId: authResult.apiKey.id,
          rateLimit: authResult.apiKey.rateLimit,
        },
      },
      {
        headers: {
          'X-API-Version': 'v1',
          'X-RateLimit-Limit': authResult.apiKey.rateLimit.toString(),
        },
      }
    );
  } catch (error) {
    console.error('[API_V1_AGENTS]', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}
