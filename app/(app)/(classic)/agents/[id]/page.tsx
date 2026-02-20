'use client';

import { useState, useEffect, useMemo, Suspense, lazy, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Settings,
  Play,
  Pause,
  MoreVertical,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  Clock,
  Zap,
  ExternalLink,
  Copy,
  Download,
  Trash2,
  Activity,
  Database,
  FileText,
  Workflow
} from 'lucide-react';
import { getAgentById } from '@/lib/agents/personas';

// Lazy load heavy components
const MotionDiv = dynamic(
  () => import('framer-motion').then(mod => {
    const { motion } = mod;
    return { default: motion.div };
  }),
  { ssr: false }
);

const AnimatePresenceWrapper = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.AnimatePresence })),
  { ssr: false }
);

// Lazy load Chart component
const PerformanceChart = dynamic(
  () => import('./PerformanceChart').then(mod => ({ default: mod.PerformanceChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-muted/30 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Chart wird geladen...</span>
      </div>
    )
  }
);

// Types
type AgentStatus = 'active' | 'paused' | 'testing' | 'error';

interface Agent {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: AgentStatus;
  industry: string;
  description: string;
  stats: {
    conversationsToday: number;
    successRate: number;
    avgResponseTime: number;
  };
  lastActivity: string;
  createdAt: Date;
}

interface ActivityItem {
  id: string;
  type: 'conversation' | 'workflow' | 'integration' | 'error';
  message: string;
  timestamp: string;
  details?: string;
}

interface Integration {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'disconnected';
  lastSync: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  trigger: string;
  executions: number;
  status: 'active' | 'paused';
}

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Reserved route names that shouldn't be treated as agent IDs
const RESERVED_ROUTES = ['studio', 'create', 'browse', 'templates', 'marketplace', 'my-agents', 'revolutionary', 'integrations'];

// Mock agents data (matching overview page)
const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Enterprise Sales Agent',
    icon: '🏢',
    color: '#ec4899',
    status: 'active',
    industry: 'Maschinenbau',
    description: 'Qualifiziert B2B-Leads und koordiniert mit dem Sales-Team',
    stats: { conversationsToday: 247, successRate: 94, avgResponseTime: 1.2 },
    lastActivity: 'vor 5 Minuten',
    createdAt: new Date('2024-11-15')
  },
  {
    id: '2',
    name: 'Customer Support Bot',
    icon: '💬',
    color: '#3b82f6',
    status: 'active',
    industry: 'E-Commerce',
    description: 'Beantwortet Kundenanfragen und erstellt Support-Tickets',
    stats: { conversationsToday: 1834, successRate: 89, avgResponseTime: 0.8 },
    lastActivity: 'vor 2 Minuten',
    createdAt: new Date('2024-11-10')
  },
  {
    id: '3',
    name: 'Lead Qualifier',
    icon: '🎯',
    color: '#8b5cf6',
    status: 'active',
    industry: 'Versicherung',
    description: 'Qualifiziert eingehende Leads und weist sie zu',
    stats: { conversationsToday: 156, successRate: 92, avgResponseTime: 1.5 },
    lastActivity: 'vor 12 Minuten',
    createdAt: new Date('2024-11-05')
  },
  {
    id: '4',
    name: 'Onboarding Assistant',
    icon: '🚀',
    color: '#10b981',
    status: 'active',
    industry: 'SaaS',
    description: 'Begleitet neue Kunden durch den Onboarding-Prozess',
    stats: { conversationsToday: 89, successRate: 96, avgResponseTime: 2.1 },
    lastActivity: 'vor 8 Minuten',
    createdAt: new Date('2024-10-28')
  },
  {
    id: '5',
    name: 'Invoice Reminder',
    icon: '💰',
    color: '#f59e0b',
    status: 'active',
    industry: 'Fintech',
    description: 'Versendet automatische Zahlungserinnerungen',
    stats: { conversationsToday: 412, successRate: 87, avgResponseTime: 0.5 },
    lastActivity: 'vor 15 Minuten',
    createdAt: new Date('2024-10-20')
  },
  {
    id: '6',
    name: 'Recruiting Assistant',
    icon: '👔',
    color: '#06b6d4',
    status: 'active',
    industry: 'HR Tech',
    description: 'Screent Bewerbungen und koordiniert Interviews',
    stats: { conversationsToday: 67, successRate: 91, avgResponseTime: 1.8 },
    lastActivity: 'vor 23 Minuten',
    createdAt: new Date('2024-10-15')
  },
  {
    id: '7',
    name: 'Feedback Collector',
    icon: '📊',
    color: '#84cc16',
    status: 'active',
    industry: 'SaaS',
    description: 'Sammelt und kategorisiert Kundenfeedback',
    stats: { conversationsToday: 198, successRate: 93, avgResponseTime: 1.0 },
    lastActivity: 'vor 18 Minuten',
    createdAt: new Date('2024-10-10')
  },
  {
    id: '8',
    name: 'Appointment Scheduler',
    icon: '📅',
    color: '#6366f1',
    status: 'active',
    industry: 'Healthcare',
    description: 'Koordiniert Termine und sendet Erinnerungen',
    stats: { conversationsToday: 324, successRate: 88, avgResponseTime: 1.3 },
    lastActivity: 'vor 6 Minuten',
    createdAt: new Date('2024-10-05')
  },
  {
    id: '9',
    name: 'Content Moderator',
    icon: '🛡️',
    color: '#ef4444',
    status: 'paused',
    industry: 'Social Media',
    description: 'Prüft User-Generated Content auf Richtlinien',
    stats: { conversationsToday: 0, successRate: 95, avgResponseTime: 0.3 },
    lastActivity: 'vor 4 Stunden',
    createdAt: new Date('2024-09-28')
  },
  {
    id: '10',
    name: 'Data Enrichment Agent',
    icon: '🔍',
    color: '#a855f7',
    status: 'paused',
    industry: 'B2B SaaS',
    description: 'Reichert CRM-Kontakte mit zusätzlichen Daten an',
    stats: { conversationsToday: 0, successRate: 90, avgResponseTime: 2.5 },
    lastActivity: 'vor 2 Tagen',
    createdAt: new Date('2024-09-20')
  },
  {
    id: '11',
    name: 'Compliance Checker',
    icon: '⚖️',
    color: '#14b8a6',
    status: 'paused',
    industry: 'Legal Tech',
    description: 'Prüft Dokumente auf DSGVO-Konformität',
    stats: { conversationsToday: 0, successRate: 97, avgResponseTime: 3.2 },
    lastActivity: 'vor 1 Woche',
    createdAt: new Date('2024-09-15')
  },
  {
    id: '12',
    name: 'Price Quote Generator',
    icon: '🧮',
    color: '#f97316',
    status: 'testing',
    industry: 'Maschinenbau',
    description: 'Erstellt automatische Preisangebote basierend auf Anfragen',
    stats: { conversationsToday: 23, successRate: 78, avgResponseTime: 1.9 },
    lastActivity: 'vor 30 Minuten',
    createdAt: new Date('2024-11-18')
  }
];

// Mock activity data
const generateMockActivity = (agentName: string): ActivityItem[] => [
  {
    id: '1',
    type: 'conversation',
    message: 'Neue Konversation gestartet',
    timestamp: 'vor 2 Minuten',
    details: 'Lead-Qualifizierung: Acme Corp'
  },
  {
    id: '2',
    type: 'workflow',
    message: 'Workflow "Lead Scoring" ausgeführt',
    timestamp: 'vor 8 Minuten',
    details: 'Score: 87/100 - High Priority'
  },
  {
    id: '3',
    type: 'integration',
    message: 'CRM-Kontakt aktualisiert',
    timestamp: 'vor 15 Minuten',
    details: 'HubSpot Integration'
  },
  {
    id: '4',
    type: 'conversation',
    message: 'Konversation erfolgreich abgeschlossen',
    timestamp: 'vor 23 Minuten',
    details: 'Dauer: 4m 32s'
  },
  {
    id: '5',
    type: 'workflow',
    message: 'Workflow "Email Follow-up" ausgeführt',
    timestamp: 'vor 35 Minuten',
    details: 'Email an 3 Leads versendet'
  },
  {
    id: '6',
    type: 'conversation',
    message: 'Neue Konversation gestartet',
    timestamp: 'vor 1 Stunde',
    details: 'Support-Anfrage: Technisches Problem'
  }
];

// Mock integrations
const MOCK_INTEGRATIONS: Integration[] = [
  {
    id: '1',
    name: 'HubSpot CRM',
    icon: '🔗',
    status: 'connected',
    lastSync: 'vor 5 Min.'
  },
  {
    id: '2',
    name: 'Gmail',
    icon: '📧',
    status: 'connected',
    lastSync: 'vor 12 Min.'
  },
  {
    id: '3',
    name: 'Slack',
    icon: '💬',
    status: 'connected',
    lastSync: 'vor 1 Std.'
  },
  {
    id: '4',
    name: 'PostgreSQL',
    icon: '🐘',
    status: 'disconnected',
    lastSync: 'vor 2 Tagen'
  }
];

// Mock workflows
const MOCK_WORKFLOWS: WorkflowItem[] = [
  {
    id: '1',
    name: 'Lead Scoring',
    trigger: 'Neue Konversation',
    executions: 247,
    status: 'active'
  },
  {
    id: '2',
    name: 'Email Follow-up',
    trigger: 'Nach 24h',
    executions: 156,
    status: 'active'
  },
  {
    id: '3',
    name: 'CRM Sync',
    trigger: 'Alle 15 Min.',
    executions: 892,
    status: 'active'
  }
];

// Loading Skeleton Component - shown immediately while page loads
const AgentDetailSkeleton = () => (
  <div className="min-h-screen bg-background p-6">
    <div className="mb-6">
      <div className="h-4 w-32 bg-muted/50 rounded mb-4 animate-pulse" />
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-muted/50 animate-pulse" />
        <div>
          <div className="h-8 w-64 bg-muted/50 rounded mb-2 animate-pulse" />
          <div className="h-4 w-48 bg-muted/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="border border-border rounded-lg p-6 bg-card h-48 animate-pulse" />
        <div className="border border-border rounded-lg p-6 bg-card h-32 animate-pulse" />
      </div>
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />)}
        </div>
        <div className="border border-border rounded-lg p-6 bg-card h-72 animate-pulse" />
      </div>
      <div className="lg:col-span-1 space-y-6">
        <div className="border border-border rounded-lg p-6 bg-card h-40 animate-pulse" />
        <div className="border border-border rounded-lg p-6 bg-card h-48 animate-pulse" />
      </div>
    </div>
  </div>
);

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const mockAgent = MOCK_AGENTS.find(a => a.id === agentId);
  const [agent, setAgent] = useState<Agent | null>(mockAgent || null);
  const [activityItems] = useState<ActivityItem[]>(
    mockAgent ? generateMockActivity(mockAgent.name) : []
  );
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Try to load custom agent from API if not in mock list
  useEffect(() => {
    const loadCustomAgent = async () => {
      // Skip API call if:
      // 1. We already have a mock agent
      // 2. The ID is a reserved route name (like "studio")
      // 3. The ID is not a valid UUID format
      if (mockAgent) {
        return;
      }

      if (RESERVED_ROUTES.includes(agentId.toLowerCase())) {
        console.log(`[AGENT_DETAIL] Skipping API call for reserved route: ${agentId}`);
        setIsPageLoading(false);
        return;
      }

      const builtInAgent = getAgentById(agentId);
      if (builtInAgent || !isValidUUID(agentId)) {
        // Built-in agents use slug IDs (e.g. 'property-sentinel'), not UUIDs
        setIsPageLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/agents/custom?id=${agentId}`);
        const result = await response.json();
        if (result.success && result.data) {
          const customAgent = result.data;
          setAgent({
            id: customAgent.id,
            name: customAgent.name,
            icon: customAgent.icon || '🤖',
            color: customAgent.color || '#3B82F6',
            status: customAgent.status === 'active' ? 'active' :
                   customAgent.status === 'paused' ? 'paused' :
                   customAgent.status === 'testing' ? 'testing' : 'paused',
            industry: 'Custom Agent',
            description: customAgent.description || '',
            stats: { conversationsToday: 0, successRate: 0, avgResponseTime: 0 },
            lastActivity: 'Nicht verfügbar',
            createdAt: new Date(customAgent.createdAt)
          });
        }
      } catch (error) {
        console.error('Failed to load custom agent:', error);
      }
    };
    loadCustomAgent();
  }, [agentId, mockAgent]);

  // Show skeleton while loading custom agent
  const [isPageLoading, setIsPageLoading] = useState(!mockAgent);

  useEffect(() => {
    if (agent) {
      setIsPageLoading(false);
    }
  }, [agent]);

  if (isPageLoading) {
    return <AgentDetailSkeleton />;
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Agent nicht gefunden</h1>
          <button
            onClick={() => router.push('/agents/overview')}
            className="text-primary hover:underline"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const handleToggleStatus = async () => {
    if (!agent) return;
    setIsLoading(true);

    try {
      const newStatus = agent.status === 'active' ? 'paused' : 'active';

      // API call to toggle status
      const response = await fetch(`/api/agents/custom?id=${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        setAgent(prev => prev ? { ...prev, status: newStatus } : null);
        console.log(`Agent status changed to: ${newStatus}`);
      } else {
        // For mock agents, just update locally
        setAgent(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error('Failed to toggle agent status:', error);
      // Fallback: update locally anyway for demo purposes
      const newStatus = agent.status === 'active' ? 'paused' : 'active';
      setAgent(prev => prev ? { ...prev, status: newStatus } : null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = () => {
    router.push(`/agents/${agent?.id}/configure?duplicate=true`);
  };

  const handleExport = () => {
    if (!agent) return;

    // Export agent configuration as JSON
    const exportData = {
      name: agent.name,
      icon: agent.icon,
      color: agent.color,
      description: agent.description,
      industry: agent.industry,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.name.replace(/\s+/g, '_').toLowerCase()}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('Agent configuration exported');
  };

  const handleDelete = async () => {
    if (!agent) return;

    if (confirm(`Möchten Sie "${agent.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      setIsLoading(true);

      try {
        // API call to delete agent
        const response = await fetch(`/api/agents/custom?id=${agentId}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
          console.log('Agent deleted successfully');
        }

        // Navigate back regardless of API result (for mock agents too)
        router.push('/agents/my-agents');
      } catch (error) {
        console.error('Failed to delete agent:', error);
        // Still navigate for demo purposes
        router.push('/agents/my-agents');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const statusConfig = {
    active: {
      label: 'Aktiv',
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30'
    },
    paused: {
      label: 'Pausiert',
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30'
    },
    testing: {
      label: 'Testing',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30'
    },
    error: {
      label: 'Error',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30'
    }
  };

  const currentStatus = statusConfig[agent.status];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/agents/overview')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Zurück zur Übersicht</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/agents/${agent.id}/configure`)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition text-sm"
            >
              <Settings className="w-4 h-4" />
              Konfigurieren
            </button>

            {agent.status === 'active' ? (
              <button
                onClick={handleToggleStatus}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
                {isLoading ? 'Wird geändert...' : 'Pausieren'}
              </button>
            ) : (
              <button
                onClick={handleToggleStatus}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isLoading ? 'Wird geändert...' : 'Aktivieren'}
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-2 border border-border rounded-lg hover:bg-muted transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresenceWrapper>
                {showActionsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowActionsMenu(false)}
                    />
                    <MotionDiv
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden"
                    >
                      <button
                        onClick={() => { handleDuplicate(); setShowActionsMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplizieren
                      </button>
                      <button
                        onClick={() => { handleExport(); setShowActionsMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Exportieren
                      </button>
                      <div className="border-t border-border" />
                      <button
                        onClick={() => { handleDelete(); setShowActionsMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Löschen
                      </button>
                    </MotionDiv>
                  </>
                )}
              </AnimatePresenceWrapper>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${agent.color}20` }}
          >
            {agent.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">{agent.name}</h1>
            <div className="flex items-center gap-3">
              <span className={`text-sm px-2 py-0.5 rounded-full border ${currentStatus.bg} ${currentStatus.color} ${currentStatus.border}`}>
                {currentStatus.label}
              </span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{agent.industry}</span>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">Erstellt: {agent.createdAt.toLocaleDateString('de-DE')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN (25%) - Agent Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Agent Info Card */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Agent Info
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Beschreibung</div>
                <p className="text-sm">{agent.description}</p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Letzte Aktivität</div>
                <p className="text-sm">{agent.lastActivity}</p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Agent ID</div>
                <code className="text-xs bg-muted px-2 py-1 rounded">{agent.id}</code>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Heute
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Konversationen</span>
                <span className="text-sm font-semibold">{agent.stats.conversationsToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Success Rate</span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {agent.stats.successRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Ø Response Time</span>
                <span className="text-sm font-semibold">{agent.stats.avgResponseTime}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN (50%) - Metrics & Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics Overview (4 Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Gespräche</span>
              </div>
              <div className="text-2xl font-bold">{agent.stats.conversationsToday}</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">+12% vs gestern</div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Success Rate</span>
              </div>
              <div className="text-2xl font-bold">{agent.stats.successRate}%</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">+2% vs gestern</div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Ø Response</span>
              </div>
              <div className="text-2xl font-bold">{agent.stats.avgResponseTime}s</div>
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">+0.2s vs gestern</div>
            </div>

            <div className="border border-border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Uptime</span>
              </div>
              <div className="text-2xl font-bold">99.8%</div>
              <div className="text-xs text-muted-foreground mt-1">30 Tage</div>
            </div>
          </div>

          {/* Performance Chart - Lazy loaded */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance (Letzte 7 Tage)
            </h2>
            <PerformanceChart agent={agent} />
          </div>

          {/* Live Activity Feed */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Live Activity Feed
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activityItems.map((item, index) => {
                const icons = {
                  conversation: <MessageSquare className="w-4 h-4 text-blue-500" />,
                  workflow: <Workflow className="w-4 h-4 text-purple-500" />,
                  integration: <Zap className="w-4 h-4 text-green-500" />,
                  error: <Activity className="w-4 h-4 text-red-500" />
                };

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition"
                  >
                    <div className="mt-0.5">{icons[item.type]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.message}</p>
                      {item.details && (
                        <p className="text-xs text-muted-foreground mt-0.5">{item.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{item.timestamp}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (25%) - Quick Links & Integrations */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Links */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Quick Links
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/agents/${agent.id}/chat`)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition rounded flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Chat öffnen
              </button>
              <button
                onClick={() => router.push(`/agents/${agent.id}/configure`)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition rounded flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Konfiguration
              </button>
              <button
                onClick={() => router.push(`/agents/${agent.id}/logs`)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition rounded flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Logs anzeigen
              </button>
              <button
                onClick={() => router.push(`/agents/${agent.id}/analytics`)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition rounded flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Analytics
              </button>
            </div>
          </div>

          {/* Connected Integrations */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Integrationen
            </h2>
            <div className="space-y-3">
              {MOCK_INTEGRATIONS.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{integration.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{integration.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {integration.status === 'connected' ? (
                          <span className="text-green-600 dark:text-green-400">
                            ● {integration.lastSync}
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">● Offline</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition">
              + Integration hinzufügen
            </button>
          </div>

          {/* Active Workflows */}
          <div className="border border-border rounded-lg p-6 bg-card">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              Aktive Workflows
            </h2>
            <div className="space-y-3">
              {MOCK_WORKFLOWS.map((workflow) => (
                <div
                  key={workflow.id}
                  className="p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-medium">{workflow.name}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      workflow.status === 'active'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {workflow.status === 'active' ? 'Aktiv' : 'Pausiert'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Trigger: {workflow.trigger}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {workflow.executions} Ausführungen
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition">
              + Workflow hinzufügen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
