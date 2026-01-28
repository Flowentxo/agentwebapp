import { NextRequest, NextResponse } from 'next/server';
import { getAllAgents, AgentPersona } from '@/lib/agents/personas';

interface QueryParams {
  query?: string;
  status?: string;
  type?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

interface AgentWithMeta extends Omit<AgentPersona, 'status' | 'icon'> {
  icon: string;
  status: 'active' | 'disabled' | 'draft' | 'beta' | 'coming-soon';
  type: 'chat' | 'tool' | 'workflow';
  tags: string[];
  updatedAt: string;
  createdAt: string;
  owner: {
    name: string;
    avatarUrl: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get user/workspace context (simulate for now)
    const userId = request.headers.get('x-user-id') || 'default-user';
    const workspaceId = request.headers.get('x-workspace-id') || 'default-workspace';

    // Debug logging
    console.log('[API /agents] Context:', {
      userId,
      workspaceId,
      params: Object.fromEntries(searchParams.entries())
    });

    // Test mode: Return hard-coded data to verify frontend
    if (searchParams.get('test') === 'seedMock') {
      return NextResponse.json({
        items: [
          {
            id: 't1',
            name: 'Dexter',
            role: 'Financial Analyst',
            type: 'chat',
            status: 'active',
            tags: ['finance', 'analysis', 'data'],
            description: 'Test Financial Analyst Agent',
            bio: 'Expert financial analyst for testing',
            specialties: ['Financial Analysis', 'ROI Calculation'],
            category: 'data',
            color: '#3B82F6',
            icon: 'BarChart3',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            owner: {
              name: 'System',
              avatarUrl: ''
            },
            available: true
          },
          {
            id: 't2',
            name: 'Cassie',
            role: 'Customer Support',
            type: 'chat',
            status: 'active',
            tags: ['support', 'customer', 'tickets'],
            description: 'Test Customer Support Agent',
            bio: 'Friendly customer support for testing',
            specialties: ['Ticket Management', 'Customer Care'],
            category: 'support',
            color: '#10B981',
            icon: 'Headphones',
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            owner: {
              name: 'Admin',
              avatarUrl: '/avatars/admin.png'
            },
            available: true
          },
          {
            id: 't3',
            name: 'Kai',
            role: 'Code Assistant',
            type: 'tool',
            status: 'disabled',
            tags: ['code', 'development', 'programming'],
            description: 'Test Code Assistant Agent',
            bio: 'Programming assistant for testing',
            specialties: ['Code Generation', 'Debugging'],
            category: 'technical',
            color: '#F59E0B',
            icon: 'Code2',
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            owner: {
              name: 'Developer',
              avatarUrl: ''
            },
            available: false
          }
        ],
        total: 3,
        page: 1,
        limit: 20,
        hasMore: false,
        totalPages: 1
      });
    }

    // Parse query parameters
    const query = searchParams.get('query')?.toLowerCase() || '';
    const statusFilter = searchParams.get('status')?.split(',').filter(Boolean) || [];
    const typeFilter = searchParams.get('type')?.split(',').filter(Boolean) || [];
    const sort = searchParams.get('sort') || 'updatedAt_desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Get all agents from personas (system agents)
    const baseAgents = getAllAgents();

    // Add custom/user agents (simulated for now)
    const customAgents: AgentPersona[] = [];

    // Combine system and custom agents
    const allAgents = [...baseAgents, ...customAgents];
    console.log('[API /agents] Total agents:', {
      systemAgents: baseAgents.length,
      customAgents: customAgents.length,
      total: allAgents.length,
      userId,
      workspaceId
    });

    // Transform to include metadata and convert icon to string
    const agents: AgentWithMeta[] = allAgents.map(agent => {
      // Get icon name from agent
      const iconName = agent.id === 'dexter' ? 'BarChart3' :
        agent.id === 'cassie' ? 'Headphones' :
          agent.id === 'emmie' ? 'Mail' :
            agent.id === 'aura' ? 'Sparkles' :
              agent.id === 'nova' ? 'Lightbulb' :
                agent.id === 'kai' ? 'Code2' :
                  agent.id === 'lex' ? 'Scale' :
                    agent.id === 'finn' ? 'DollarSign' :
                      agent.id === 'ari' ? 'Users' :
                        agent.id === 'echo' ? 'FileText' :
                          agent.id === 'vera' ? 'CheckCircle2' :
                            agent.id === 'omni' ? 'Bot' :
                              agent.id.startsWith('custom-') ? 'User' :
                                'MessageSquare';

      return {
        ...agent,
        icon: iconName, // Use icon name string instead of component
        status: (agent.status as any) || 'active', // Preserve original status
        type: agent.category === 'data' ? 'tool' :
          agent.category === 'technical' ? 'tool' :
            agent.category === 'operations' ? 'workflow' : 'chat',
        tags: agent.specialties.slice(0, 3),
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        owner: {
          name: 'System Admin',
          avatarUrl: '/avatars/admin.png'
        }
      };
    });

    // Apply search filter
    let filteredAgents = agents;
    if (query) {
      filteredAgents = filteredAgents.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      filteredAgents = filteredAgents.filter(agent =>
        statusFilter.includes(agent.status)
      );
    }

    // Apply type filter
    if (typeFilter.length > 0) {
      filteredAgents = filteredAgents.filter(agent =>
        typeFilter.includes(agent.type)
      );
    }

    // Apply sorting
    const [sortField, sortOrder] = sort.split('_');
    filteredAgents.sort((a, b) => {
      let aValue: any = a;
      let bValue: any = b;

      switch (sortField) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
      }

      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // Apply pagination
    const total = filteredAgents.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAgents = filteredAgents.slice(startIndex, endIndex);

    // Debug logging
    console.log('[API /agents] Results:', {
      baseAgents: baseAgents.length,
      afterFilters: filteredAgents.length,
      paginated: paginatedAgents.length,
      total,
      page,
      limit
    });

    return NextResponse.json({
      items: paginatedAgents,
      total,
      page,
      limit,
      hasMore: endIndex < total,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST endpoint for creating new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Implement agent creation logic
    // For now, return a mock response
    return NextResponse.json({
      id: `agent_${Date.now()}`,
      ...body,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
