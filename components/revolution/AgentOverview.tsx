import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Pause,
  Play,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Settings,
  Trash2,
  MessageSquare,
  BarChart3,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { dummyAgents, type Agent } from './data';

interface AgentOverviewProps {
  onAgentSelect?: (agent: Agent) => void;
  onAgentEdit?: (agent: Agent) => void;
  onAgentDelete?: (agentId: string) => void;
}

const StatusIcons = {
  active: CheckCircle,
  paused: Pause,
  draft: Clock
};

const StatusColors = {
  active: 'text-green-400 bg-green-400/10',
  paused: 'text-yellow-400 bg-yellow-400/10',
  draft: 'text-blue-400 bg-blue-400/10'
};

const TrendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus
};

const TrendColors = {
  up: 'text-green-400',
  down: 'text-red-400',
  stable: 'text-text-muted'
};

export default function AgentOverview({ 
  onAgentSelect, 
  onAgentEdit, 
  onAgentDelete 
}: AgentOverviewProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const handleAgentAction = (action: string, agent: Agent) => {
    switch (action) {
      case 'view':
        onAgentSelect?.(agent);
        break;
      case 'edit':
        onAgentEdit?.(agent);
        break;
      case 'delete':
        onAgentDelete?.(agent.id);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Deine Agenten</h2>
          <p className="text-text-muted mt-1">
            Übersicht über alle aktiven und pausierten Agenten
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-text-muted">
            {dummyAgents.length} Agenten insgesamt
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dummyAgents.map((agent) => {
          const StatusIcon = StatusIcons[agent.status];
          const statusColor = StatusColors[agent.status];
          
          return (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-surface-1 border border-white/10 rounded-xl p-6 transition-all duration-200 hover:border-white/20 hover:bg-card/5 hover:shadow-lg"
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text group-hover:text-blue-400 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-text-muted line-clamp-2">
                      {agent.description}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusColor}`}>
                  <StatusIcon className="w-3 h-3" />
                  {agent.status === 'active' ? 'Aktiv' : 
                   agent.status === 'paused' ? 'Pausiert' : 'Entwurf'}
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 2).map((capability, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs bg-card/5 text-text-muted hover:bg-card/10"
                    >
                      {capability}
                    </Badge>
                  ))}
                  {agent.capabilities.length > 2 && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-card/5 text-text-muted hover:bg-card/10"
                    >
                      +{agent.capabilities.length - 2}
                    </Badge>
                  )}
                </div>
              </div>

              {/* KPIs */}
              <div className="space-y-3 mb-4">
                {agent.kpis.slice(0, 2).map((kpi, index) => {
                  const TrendIcon = TrendIcons[kpi.trend || 'stable'];
                  const trendColor = TrendColors[kpi.trend || 'stable'];
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-text-muted">{kpi.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-text">{kpi.value}</span>
                        {kpi.trend && (
                          <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Last Activity */}
              <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
                <Clock className="w-3 h-3" />
                <span>Letzte Aktivität: {agent.lastActivity}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {agent.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAgentAction('view', agent)}
                  className="flex-1 border-white/10 text-text hover:bg-card/5"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ansehen
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAgentAction('edit', agent)}
                  className="border-white/10 text-text hover:bg-card/5"
                >
                  <Settings className="w-4 h-4" />
                </Button>

                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-text-muted hover:text-text"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {dummyAgents.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-text-muted opacity-30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">Noch keine Agenten erstellt</h3>
          <p className="text-text-muted">
            Erstelle deinen ersten Agenten und starte in 30 Sekunden
          </p>
        </div>
      )}
    </div>
  );
}