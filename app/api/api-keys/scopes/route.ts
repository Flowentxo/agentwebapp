/**
 * API Key Scopes Information Endpoint
 *
 * GET /api/api-keys/scopes - Get available scopes and scope groups
 */

import { NextRequest, NextResponse } from 'next/server';
import { API_SCOPES, SCOPE_GROUPS } from '@/lib/db/schema-api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/api-keys/scopes - Get available scopes
 */
export async function GET(req: NextRequest) {
  try {
    // Organize scopes by category
    const scopesByCategory = {
      agents: {
        title: 'Agent Operations',
        description: 'Permissions for managing and executing AI agents',
        scopes: [
          { value: API_SCOPES.AGENTS_READ, label: 'Read Agents', description: 'View agent details and status' },
          { value: API_SCOPES.AGENTS_WRITE, label: 'Write Agents', description: 'Create and modify agents' },
          { value: API_SCOPES.AGENTS_EXECUTE, label: 'Execute Agents', description: 'Run agent tasks' },
        ],
      },
      knowledge: {
        title: 'Knowledge Base',
        description: 'Permissions for managing knowledge documents',
        scopes: [
          { value: API_SCOPES.KNOWLEDGE_READ, label: 'Read Knowledge', description: 'Access knowledge base' },
          { value: API_SCOPES.KNOWLEDGE_WRITE, label: 'Write Knowledge', description: 'Create and update documents' },
          { value: API_SCOPES.KNOWLEDGE_DELETE, label: 'Delete Knowledge', description: 'Remove documents' },
        ],
      },
      workflows: {
        title: 'Workflows',
        description: 'Permissions for workflow automation',
        scopes: [
          { value: API_SCOPES.WORKFLOWS_READ, label: 'Read Workflows', description: 'View workflows' },
          { value: API_SCOPES.WORKFLOWS_WRITE, label: 'Write Workflows', description: 'Create and modify workflows' },
          { value: API_SCOPES.WORKFLOWS_EXECUTE, label: 'Execute Workflows', description: 'Run workflows' },
        ],
      },
      analytics: {
        title: 'Analytics',
        description: 'Permissions for viewing analytics data',
        scopes: [
          { value: API_SCOPES.ANALYTICS_READ, label: 'Read Analytics', description: 'View analytics and reports' },
        ],
      },
      webhooks: {
        title: 'Webhooks',
        description: 'Permissions for webhook management',
        scopes: [
          { value: API_SCOPES.WEBHOOKS_READ, label: 'Read Webhooks', description: 'View webhook configurations' },
          { value: API_SCOPES.WEBHOOKS_WRITE, label: 'Write Webhooks', description: 'Create and modify webhooks' },
        ],
      },
      admin: {
        title: 'Administration',
        description: 'Administrative permissions (use with caution)',
        scopes: [
          { value: API_SCOPES.ADMIN_USERS, label: 'Manage Users', description: 'User management' },
          { value: API_SCOPES.ADMIN_SETTINGS, label: 'Manage Settings', description: 'System settings' },
          { value: API_SCOPES.ADMIN_API_KEYS, label: 'Manage API Keys', description: 'API key management' },
        ],
      },
    };

    // Scope presets
    const presets = {
      readOnly: {
        name: 'Read Only',
        description: 'View-only access to all resources',
        scopes: SCOPE_GROUPS.READ_ONLY,
      },
      fullAccess: {
        name: 'Full Access',
        description: 'Complete access to all features',
        scopes: SCOPE_GROUPS.FULL_ACCESS,
      },
      agentAdmin: {
        name: 'Agent Administrator',
        description: 'Full control over agents',
        scopes: SCOPE_GROUPS.AGENT_ADMIN,
      },
      knowledgeAdmin: {
        name: 'Knowledge Administrator',
        description: 'Full control over knowledge base',
        scopes: SCOPE_GROUPS.KNOWLEDGE_ADMIN,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        categories: scopesByCategory,
        presets,
        allScopes: Object.values(API_SCOPES),
      },
    });
  } catch (error) {
    console.error('[API_KEY_SCOPES]', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch scopes' },
      { status: 500 }
    );
  }
}
