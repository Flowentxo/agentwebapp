'use client';

/**
 * MULTI-AGENT COMMUNICATION DASHBOARD
 *
 * Monitor and manage agent-to-agent communication and task delegation
 */

import { useState, useEffect } from 'react';
import {
  getAgentMessages,
  getAgentDelegations,
  getMultiAgentStats,
  acceptDelegation,
  AgentMessage,
  AgentDelegation,
  MultiAgentStats
} from '@/lib/api/multi-agent-client';
import {
  Network,
  MessageSquare,
  GitBranch,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Send,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function MultiAgentPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [delegations, setDelegations] = useState<AgentDelegation[]>([]);
  const [stats, setStats] = useState<MultiAgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  // Available agents (from your system)
  const agents = [
    { id: 'dexter', name: 'Dexter', role: 'Data Analyst' },
    { id: 'cassie', name: 'Cassie', role: 'Customer Support' },
    { id: 'emmie', name: 'Emmie', role: 'Email Manager' },
    { id: 'aura', name: 'Aura', role: 'Workflow Orchestrator' }
  ];

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load stats
      const statsResponse = await getMultiAgentStats();
      setStats(statsResponse.stats);

      // Load messages for selected agent (or all)
      if (selectedAgent !== 'all') {
        const messagesResponse = await getAgentMessages({
          agentId: selectedAgent,
          limit: 50
        });
        setMessages(messagesResponse.messages);

        const delegationsResponse = await getAgentDelegations({
          agentId: selectedAgent,
          limit: 50
        });
        setDelegations(delegationsResponse.delegations);
      } else {
        // Load for all agents
        setMessages([]);
        setDelegations([]);
      }

    } catch (error: any) {
      console.error('[MultiAgent] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptDelegation = async (delegationId: string) => {
    try {
      await acceptDelegation(delegationId);
      await loadData(); // Reload
    } catch (error: any) {
      alert(`Failed to accept delegation: ${error.message}`);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [selectedAgent]);

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgb(var(--accent))]/20">
              <Network className="h-6 w-6 text-[rgb(var(--accent))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text">Multi-Agent Communication</h1>
              <p className="text-sm text-text-muted mt-1">
                Monitor agent-to-agent messaging and task delegation
              </p>
            </div>
          </div>
        </div>

        {/* Agent Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedAgent('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              selectedAgent === 'all'
                ? 'bg-[rgb(var(--accent))] text-white'
                : 'border border-white/10 bg-surface-1 text-text hover:bg-card/5'
            }`}
          >
            All Agents
          </button>
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                selectedAgent === agent.id
                  ? 'bg-[rgb(var(--accent))] text-white'
                  : 'border border-white/10 bg-surface-1 text-text hover:bg-card/5'
              }`}
            >
              {agent.name}
            </button>
          ))}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              icon={MessageSquare}
              label="Total Messages"
              value={stats.totalMessages}
              color="#8B5CF6"
            />
            <StatCard
              icon={GitBranch}
              label="Total Delegations"
              value={stats.totalDelegations}
              color="#F59E0B"
            />
            <StatCard
              icon={Activity}
              label="Active Delegations"
              value={stats.activeDelegations}
              color="#3B82F6"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={stats.completedDelegations}
              color="#10B981"
            />
          </div>
        )}

        {selectedAgent === 'all' ? (
          <div className="rounded-lg border border-white/10 bg-surface-1 p-12 text-center">
            <Network className="h-16 w-16 text-text-muted mx-auto mb-4 opacity-50" />
            <p className="text-text-muted">
              Select an agent to view their messages and delegations
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Messages */}
            <div className="rounded-lg border border-white/10 bg-surface-1 p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Messages
                  </h2>
                  <span className="text-sm text-text-muted">
                    {messages.length} message{messages.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--accent))]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-text-muted opacity-50 mb-4" />
                  <p className="text-sm text-text-muted">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {messages.map((message) => (
                    <MessageCard key={message.id} message={message} agents={agents} />
                  ))}
                </div>
              )}
            </div>

            {/* Delegations */}
            <div className="rounded-lg border border-white/10 bg-surface-1 p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Delegations
                  </h2>
                  <span className="text-sm text-text-muted">
                    {delegations.length} delegation{delegations.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--accent))]" />
                </div>
              ) : delegations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <GitBranch className="h-12 w-12 text-text-muted opacity-50 mb-4" />
                  <p className="text-sm text-text-muted">No delegations yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {delegations.map((delegation) => (
                    <DelegationCard
                      key={delegation.id}
                      delegation={delegation}
                      agents={agents}
                      onAccept={handleAcceptDelegation}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-surface-1 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-text">{value.toLocaleString()}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </motion.div>
  );
}

interface MessageCardProps {
  message: AgentMessage;
  agents: Array<{ id: string; name: string; role: string }>;
}

function MessageCard({ message, agents }: MessageCardProps) {
  const fromAgent = agents.find((a) => a.id === message.fromAgentId);
  const toAgent = agents.find((a) => a.id === message.toAgentId);

  const getStatusColor = () => {
    switch (message.status) {
      case 'processed':
        return 'text-green-500';
      case 'delivered':
        return 'text-blue-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-lg border border-white/10 bg-surface-0 p-4 hover:border-white/20 transition"
    >
      <div className="flex items-start gap-3 mb-3">
        <Send className="h-4 w-4 text-[rgb(var(--accent))] mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="font-medium text-text">{fromAgent?.name || message.fromAgentId}</span>
            <ArrowRight className="h-3 w-3 text-text-muted" />
            <span className="font-medium text-text">{toAgent?.name || message.toAgentId}</span>
          </div>
          {message.subject && (
            <p className="text-sm font-semibold text-text mb-2">{message.subject}</p>
          )}
          <p className="text-xs text-text-muted line-clamp-2">{message.content}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
        </span>
        <span className={`font-medium ${getStatusColor()}`}>
          {message.status}
        </span>
      </div>
    </motion.div>
  );
}

interface DelegationCardProps {
  delegation: AgentDelegation;
  agents: Array<{ id: string; name: string; role: string }>;
  onAccept: (delegationId: string) => void;
}

function DelegationCard({ delegation, agents, onAccept }: DelegationCardProps) {
  const fromAgent = agents.find((a) => a.id === delegation.delegatedBy);
  const toAgent = agents.find((a) => a.id === delegation.delegatedTo);

  const getStatusBadge = () => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-500',
      accepted: 'bg-blue-500/20 text-blue-500',
      in_progress: 'bg-purple-500/20 text-purple-500',
      completed: 'bg-green-500/20 text-green-500',
      failed: 'bg-red-500/20 text-red-500',
      rejected: 'bg-muted/500/20 text-muted-foreground'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[delegation.status]}`}>
        {delegation.status === 'pending' && <Clock className="h-3 w-3" />}
        {delegation.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
        {delegation.status === 'failed' && <XCircle className="h-3 w-3" />}
        {delegation.status}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-lg border border-white/10 bg-surface-0 p-4 hover:border-white/20 transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-text">{fromAgent?.name || delegation.delegatedBy}</span>
          <ArrowRight className="h-3 w-3 text-text-muted" />
          <span className="font-medium text-text">{toAgent?.name || delegation.delegatedTo}</span>
        </div>
        {getStatusBadge()}
      </div>

      <h4 className="text-sm font-semibold text-text mb-2">{delegation.taskName}</h4>
      {delegation.taskDescription && (
        <p className="text-xs text-text-muted mb-3 line-clamp-2">{delegation.taskDescription}</p>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">
          {formatDistanceToNow(new Date(delegation.createdAt), { addSuffix: true })}
        </span>

        {delegation.status === 'pending' && (
          <button
            onClick={() => onAccept(delegation.id)}
            className="text-[rgb(var(--accent))] hover:underline font-medium"
          >
            Accept
          </button>
        )}
      </div>

      {delegation.error && (
        <div className="mt-3 text-xs text-red-500 bg-red-500/10 rounded px-2 py-1">
          Error: {delegation.error}
        </div>
      )}
    </motion.div>
  );
}
