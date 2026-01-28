import { type Agent } from '../AgentsTable';
import { type Conversation, type ChatMessage, type QuickPrompt, type SlashCommand, type AgentContext } from './types';
import { type Incident } from '../IncidentsTimeline';

// Generate conversations from agents
export function generateConversations(agents: Agent[]): Conversation[] {
  const now = new Date();

  return agents.map((agent, index) => {
    const hasMessages = index < 3; // First 3 agents have existing conversations

    const messages: ChatMessage[] = hasMessages
      ? [
          {
            id: `msg-${agent.id}-1`,
            role: 'user',
            type: 'text',
            content: `Wie ist der Status von ${agent.name}?`,
            timestamp: new Date(now.getTime() - 3600000), // 1 hour ago
          },
          {
            id: `msg-${agent.id}-2`,
            role: 'agent',
            type: 'text',
            content: `Hallo! Ich bin ${agent.name}. ${agent.description} Aktuell läuft alles stabil mit ${agent.successRate}% Erfolgsrate.`,
            timestamp: new Date(now.getTime() - 3500000),
            agentId: agent.id,
            agentName: agent.name,
            tokens: 156,
            latency: agent.avgTimeSec,
          },
        ]
      : [];

    const lastMessage = hasMessages
      ? messages[messages.length - 1].content.slice(0, 60) + '...'
      : undefined;

    return {
      id: `conv-${agent.id}`,
      agentId: agent.id,
      agentName: agent.name,
      agentDescription: agent.description,
      lastMessage,
      lastActivity: hasMessages
        ? messages[messages.length - 1].timestamp
        : new Date(now.getTime() - index * 7200000), // Staggered
      status: agent.status,
      unreadCount: index === 1 ? 2 : undefined, // Aura has unread messages
      messages,
      isPinned: index < 2, // Pin first 2 agents
    };
  });
}

// Quick prompts per agent
export function getQuickPrompts(agentId: string): QuickPrompt[] {
  const commonPrompts: QuickPrompt[] = [
    {
      id: 'status',
      label: 'Status prüfen',
      prompt: 'Wie ist dein aktueller Status?',
      icon: '📊',
    },
    {
      id: 'last-24h',
      label: 'Letzte 24h',
      prompt: 'Analyse der letzten 24 Stunden',
      icon: '📈',
    },
  ];

  // Agent-specific prompts
  const specificPrompts: Record<string, QuickPrompt[]> = {
    dexter: [
      {
        id: 'analyze',
        label: 'Daten analysieren',
        prompt: 'Analysiere die aktuellen Performance-Metriken',
        icon: '🔍',
      },
    ],
    cassie: [
      {
        id: 'support',
        label: 'Support-Tickets',
        prompt: 'Zeige offene Support-Tickets',
        icon: '🎫',
      },
    ],
    aura: [
      {
        id: 'workflows',
        label: 'Workflows',
        prompt: 'Zeige alle laufenden Workflows',
        icon: '⚙️',
      },
    ],
  };

  return [...commonPrompts, ...(specificPrompts[agentId] || [])];
}

// Slash commands
export const slashCommands: SlashCommand[] = [
  {
    command: 'deploy',
    description: 'Deployment starten',
    args: ['environment', 'version'],
    category: 'deployment',
  },
  {
    command: 'log',
    description: 'Logs anzeigen',
    args: ['level', 'time'],
    category: 'logs',
  },
  {
    command: 'route',
    description: 'An anderen Agent weiterleiten',
    args: ['@agent'],
    category: 'routing',
  },
  {
    command: 'summarize',
    description: 'Zusammenfassung erstellen',
    args: ['timeframe'],
    category: 'analysis',
  },
  {
    command: 'restart',
    description: 'Agent neu starten',
    category: 'system',
  },
  {
    command: 'stop',
    description: 'Agent stoppen',
    category: 'system',
  },
];

// Agent context
export function getAgentContext(agentId: string): AgentContext {
  const contexts: Record<string, AgentContext> = {
    dexter: {
      dataSources: ['PostgreSQL', 'BigQuery', 'Redis Cache'],
      scope: 'staging',
      permissions: ['read-logs', 'read-db'],
      memory: true,
    },
    cassie: {
      dataSources: ['CRM Database', 'Email System', 'Knowledge Base'],
      permissions: ['read-logs', 'read-db', 'write-db'],
      memory: true,
    },
    aura: {
      dataSources: ['Workflow Engine', 'CI/CD Pipeline'],
      scope: 'production',
      permissions: ['read-logs', 'write-ci', 'deploy'],
      memory: true,
    },
  };

  return (
    contexts[agentId] || {
      dataSources: [],
      permissions: ['read-logs'],
      memory: false,
    }
  );
}

// Generate incidents for context sidebar
export function getAgentIncidents(agentId: string): Incident[] {
  const now = new Date();

  return [
    {
      id: `incident-${agentId}-1`,
      type: 'deploy',
      agentName: agentId,
      message: `Version 2.1.0 erfolgreich deployed`,
      timestamp: new Date(now.getTime() - 7200000), // 2h ago
    },
    {
      id: `incident-${agentId}-2`,
      type: 'spike',
      agentName: agentId,
      message: `Traffic-Spike erkannt (+45%)`,
      timestamp: new Date(now.getTime() - 3600000), // 1h ago
      severity: 'warning',
    },
  ];
}

// Generate tasks
export function getAgentTasks(agentId: string) {
  return [
    {
      id: `task-${agentId}-1`,
      title: 'Health Check durchführen',
      status: 'running' as const,
    },
    {
      id: `task-${agentId}-2`,
      title: 'Log-Rotation',
      status: 'pending' as const,
    },
  ];
}
