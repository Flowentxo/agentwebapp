'use client';

import { useState, useEffect } from 'react';
import { REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';
import { RevolutionaryAvatar } from '@/components/agents/RevolutionaryAvatar';
import { Brain, Zap, MessageSquare, FileText, Code, TrendingUp, CheckCircle } from 'lucide-react';

interface Activity {
  id: string;
  agentId: string;
  type: 'thought' | 'action' | 'completion' | 'insight';
  message: string;
  timestamp: Date;
}

const ACTIVITY_TEMPLATES = [
  { agentId: 'dexter', type: 'action' as const, message: 'Analyzing Q4 sales performance data' },
  { agentId: 'cassie', type: 'thought' as const, message: 'Reviewing customer support tickets' },
  { agentId: 'emmie', type: 'action' as const, message: 'Drafting weekly team update email' },
  { agentId: 'kai', type: 'action' as const, message: 'Reviewing code changes in PR #142' },
  { agentId: 'finn', type: 'insight' as const, message: 'Identified cost-saving opportunity' },
  { agentId: 'aura', type: 'thought' as const, message: 'Planning next sprint objectives' },
  { agentId: 'dexter', type: 'completion' as const, message: 'Completed revenue analysis report' },
  { agentId: 'cassie', type: 'completion' as const, message: 'Resolved 3 customer inquiries' },
];

export function AgentActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  // Simulate real-time activities
  useEffect(() => {
    // Add initial activities
    const initialActivities: Activity[] = ACTIVITY_TEMPLATES.slice(0, 3).map((template, index) => ({
      id: `activity-${Date.now()}-${index}`,
      ...template,
      timestamp: new Date(Date.now() - (3 - index) * 60000) // Spread over last 3 minutes
    }));
    setActivities(initialActivities);

    // Add new activities periodically
    const interval = setInterval(() => {
      const randomTemplate = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
      const newActivity: Activity = {
        id: `activity-${Date.now()}`,
        ...randomTemplate,
        timestamp: new Date()
      };

      setActivities(prev => [newActivity, ...prev].slice(0, 10)); // Keep last 10
    }, 8000); // New activity every 8 seconds

    return () => clearInterval(interval);
  }, []);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'thought': return <Brain className="h-3 w-3" />;
      case 'action': return <Zap className="h-3 w-3" />;
      case 'completion': return <CheckCircle className="h-3 w-3" />;
      case 'insight': return <TrendingUp className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'thought': return { bg: '#60a5fa20', border: '#60a5fa40', text: '#60a5fa' }; // blue
      case 'action': return { bg: '#fbbf2420', border: '#fbbf2440', text: '#fbbf24' }; // amber
      case 'completion': return { bg: '#34d39920', border: '#34d39940', text: '#34d399' }; // green
      case 'insight': return { bg: '#a78bfa20', border: '#a78bfa40', text: '#a78bfa' }; // purple
      default: return { bg: '#6b728020', border: '#6b728040', text: '#6b7280' }; // gray
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-card/5 p-6 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-text">Live Activity Feed</h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-text-muted">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {activities.length === 0 && (
          <div className="py-8 text-center text-sm text-text-muted">
            Waiting for agent activity...
          </div>
        )}

        {activities.map((activity, index) => {
          const agent = REVOLUTIONARY_PERSONAS[activity.agentId as keyof typeof REVOLUTIONARY_PERSONAS];
          if (!agent) return null;

          const colors = getActivityColor(activity.type);

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-xl border p-3 transition-all duration-300 hover:bg-card/5 animate-fadeInUp"
              style={{
                background: colors.bg,
                borderColor: colors.border,
                animationDelay: `${index * 0.05}s`
              }}
            >
              {/* Agent Avatar */}
              <div className="flex-shrink-0">
                <RevolutionaryAvatar
                  personality={agent}
                  size="sm"
                  animated={true}
                  showGlow={false}
                />
              </div>

              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="font-bold text-sm"
                    style={{
                      background: agent.colors.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    {agent.name}
                  </span>

                  {/* Activity Type Badge */}
                  <span
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium capitalize"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    {getActivityIcon(activity.type)}
                    {activity.type}
                  </span>
                </div>

                <p className="text-sm text-text-muted mb-1">{activity.message}</p>

                <div className="text-xs text-text-subtle">
                  {getTimeAgo(activity.timestamp)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
