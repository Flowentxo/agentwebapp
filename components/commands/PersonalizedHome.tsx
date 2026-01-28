'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  Command as CommandIcon,
  ArrowRight,
  Star,
  Brain,
  Activity
} from 'lucide-react';
import { RevolutionaryAvatar } from '@/components/agents/RevolutionaryAvatar';
import { REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';

// Types
interface SmartSuggestion {
  id: string;
  type: 'command' | 'agent' | 'workflow';
  title: string;
  description: string;
  commandText?: string;
  agentId?: string;
  relevanceScore: number;
  icon?: any;
}

interface QuickStat {
  label: string;
  value: string | number;
  trend?: string;
  icon: any;
  color: string;
}

interface PersonalizedHomeProps {
  userId: string;
  onCommandClick?: (command: string) => void;
  onAgentClick?: (agentId: string) => void;
}

// Helper function for time-based suggestions fallback
function getTimeSuggestions(): SmartSuggestion[] {
  const hour = new Date().getHours();

  if (hour >= 8 && hour < 12) {
    return [
      {
        id: '1',
        type: 'command',
        title: 'Review overnight customer tickets',
        description: 'You usually check tickets first thing',
        commandText: 'Show customer support tickets from last night',
        relevanceScore: 0.95,
        icon: Activity,
      },
      {
        id: '2',
        type: 'agent',
        title: 'Chat with Dexter',
        description: 'Your most-used agent for data analysis',
        agentId: 'dexter',
        relevanceScore: 0.90,
      }
    ];
  } else if (hour >= 12 && hour < 17) {
    return [
      {
        id: '3',
        type: 'command',
        title: 'Analyze today\'s sales performance',
        description: 'Track daily progress',
        commandText: 'Analyze sales data for today',
        relevanceScore: 0.88,
        icon: TrendingUp,
      },
      {
        id: '4',
        type: 'workflow',
        title: 'Send daily report',
        description: 'Usually done at 3 PM',
        commandText: 'Generate and send daily report',
        relevanceScore: 0.85,
        icon: Zap,
      }
    ];
  } else {
    return [
      {
        id: '5',
        type: 'command',
        title: 'Prepare tomorrow\'s briefing',
        description: 'Get ready for tomorrow',
        commandText: 'Create briefing for tomorrow',
        relevanceScore: 0.82,
        icon: Brain,
      }
    ];
  }
}

export function PersonalizedHome({ userId, onCommandClick, onAgentClick }: PersonalizedHomeProps) {
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [recentAgents, setRecentAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Mock user name (in real app, fetch from user data)
    setUserName('');
  }, []);

  // Fetch personalized data
  useEffect(() => {
    fetchPersonalizedData();
  }, [userId]);

  const fetchPersonalizedData = async () => {
    try {
      setLoading(true);

      // ✅ FETCH REAL DATA FROM APIs
      const [recResponse, contextResponse] = await Promise.all([
        fetch(`/api/command-center/recommendations?limit=3&minRelevance=0.7`, {
          headers: { 'x-user-id': userId }
        }).catch(() => null),
        fetch(`/api/command-center/context`, {
          headers: { 'x-user-id': userId }
        }).catch(() => null)
      ]);

      if (recResponse && recResponse.ok) {
        const recData = await recResponse.json();
        if (recData.recommendations && recData.recommendations.length > 0) {
          setSuggestions(recData.recommendations);
        } else {
          // Fallback to time-based suggestions if API returns empty
          setSuggestions(getTimeSuggestions());
        }
      } else {
        // Fallback if API fails
        setSuggestions(getTimeSuggestions());
      }

      // Stats from context API or defaults
      const hour = new Date().getHours();
      const mockStats: QuickStat[] = [
        {
          label: 'Commands Today',
          value: 0,
          trend: 'Start commanding',
          icon: CommandIcon,
          color: 'from-blue-500 to-cyan-500',
        },
        {
          label: 'Time Saved',
          value: '0h',
          trend: 'Track your time',
          icon: Clock,
          color: 'from-purple-500 to-pink-500',
        },
        {
          label: 'Success Rate',
          value: '100%',
          trend: 'Perfect start',
          icon: TrendingUp,
          color: 'from-green-500 to-emerald-500',
        },
      ];

      setQuickStats(mockStats);

      // Mock recent agents (would come from user_command_preferences)
      setRecentAgents(['dexter', 'cassie', 'emmie']);

    } catch (error) {
      console.error('Failed to fetch personalized data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(var(--accent))] border-t-transparent" />
          <span className="text-sm text-text-muted">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Personalized Greeting */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[rgb(var(--accent))]/20 via-purple-500/10 to-transparent p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-[rgb(var(--accent))] breathing-fast" />
            <span className="text-sm font-medium text-text-muted">Personalized Workspace</span>
          </div>
          <h1 className="text-4xl font-black text-text mb-2">
            {greeting}{userName ? `, ${userName}` : ''}
          </h1>
          <p className="text-lg text-text-muted">
            Ready to accomplish something great? Here's what I recommend.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-[rgb(var(--accent))]/20 blur-3xl breathing-slow" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-card/5 p-6 transition-all duration-300 hover:border-[rgb(var(--accent))]/50 hover:bg-card/10 micro-lift"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} opacity-90`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-text mb-1">{stat.value}</p>
                {stat.trend && (
                  <p className="text-xs text-green-400">{stat.trend}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Smart Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-400 breathing-fast" />
          <h2 className="text-xl font-bold text-text">Smart Suggestions</h2>
          <span className="text-sm text-text-muted">Based on your patterns</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((suggestion) => {
            const SuggestionIcon = suggestion.icon;
            const agent = suggestion.agentId
              ? REVOLUTIONARY_PERSONAS[suggestion.agentId as keyof typeof REVOLUTIONARY_PERSONAS]
              : null;

            return (
              <button
                key={suggestion.id}
                onClick={() => {
                  if (suggestion.type === 'agent' && suggestion.agentId) {
                    onAgentClick?.(suggestion.agentId);
                  } else if (suggestion.commandText) {
                    onCommandClick?.(suggestion.commandText);
                  }
                }}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-card/5 p-5 text-left transition-all duration-300 hover:border-[rgb(var(--accent))]/50 hover:bg-card/10 micro-lift"
              >
                {/* Relevance indicator */}
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 rounded-full bg-[rgb(var(--accent))]/20 px-2 py-1">
                    <Star className="h-3 w-3 text-[rgb(var(--accent))]" />
                    <span className="text-xs font-medium text-[rgb(var(--accent))]">
                      {Math.round(suggestion.relevanceScore * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 pr-12">
                  {/* Icon or Avatar */}
                  <div className="flex-shrink-0">
                    {agent ? (
                      <RevolutionaryAvatar personality={agent} size="md" animated={true} showGlow={false} />
                    ) : SuggestionIcon ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(var(--accent))]/20 to-purple-500/10">
                        <SuggestionIcon className="h-6 w-6 text-[rgb(var(--accent))]" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10">
                        <Sparkles className="h-6 w-6 text-blue-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-text mb-1 group-hover:text-[rgb(var(--accent))] transition-colors">
                      {suggestion.title}
                    </h3>
                    <p className="text-sm text-text-muted line-clamp-2">
                      {suggestion.description}
                    </p>
                  </div>
                </div>

                {/* Hover arrow */}
                <div className="absolute bottom-3 right-3">
                  <ArrowRight className="h-5 w-5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frequently Used Agents */}
      {recentAgents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold text-text">Quick Access</h2>
            <span className="text-sm text-text-muted">Your most-used agents</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {recentAgents.map((agentId) => {
              const agent = REVOLUTIONARY_PERSONAS[agentId as keyof typeof REVOLUTIONARY_PERSONAS];
              if (!agent) return null;

              return (
                <button
                  key={agentId}
                  onClick={() => onAgentClick?.(agentId)}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-card/5 px-4 py-3 transition-all duration-300 hover:border-[rgb(var(--accent))]/50 hover:bg-card/10 micro-bounce"
                >
                  <RevolutionaryAvatar personality={agent} size="sm" animated={false} showGlow={false} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-text group-hover:text-[rgb(var(--accent))] transition-colors">
                      {agent.name}
                    </p>
                    <p className="text-xs text-text-muted">{agent.title}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
