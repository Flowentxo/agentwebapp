'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command as CommandIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';
import { parseCommand, type ParsedCommand } from '@/lib/commands/command-parser';
import { CommandCenter } from './CommandCenter';
import { RevolutionaryAvatar } from '@/components/agents/RevolutionaryAvatar';
import { REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';

interface SimplifiedCommandCenterProps {
  userId: string;
  onCommandExecute?: (command: ParsedCommand) => void;
}

interface QuickAction {
  id: string;
  label: string;
  command: string;
  icon?: any;
  color: string;
}

export function SimplifiedCommandCenter({
  userId,
  onCommandExecute,
}: SimplifiedCommandCenterProps) {
  const router = useRouter();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [quickStats, setQuickStats] = useState({
    commandsToday: 0,
    timeSaved: '0h',
    successRate: 0,
  });

  // Quick actions based on most common patterns
  const quickActions: QuickAction[] = [
    { id: '1', label: 'Analyze Data', command: 'Analyze sales data', icon: TrendingUp, color: 'from-blue-500 to-cyan-500' },
    { id: '2', label: 'Send Email', command: 'Send email to team', icon: Zap, color: 'from-purple-500 to-pink-500' },
    { id: '3', label: 'Review Tickets', command: 'Show customer support tickets', icon: Clock, color: 'from-green-500 to-emerald-500' },
    { id: '4', label: 'Generate Report', command: 'Create daily report', icon: CommandIcon, color: 'from-amber-500 to-orange-500' },
    { id: '5', label: 'Code Review', command: 'Review recent code changes', icon: Sparkles, color: 'from-indigo-500 to-purple-500' },
    { id: '6', label: 'Check Metrics', command: 'Show performance metrics', icon: TrendingUp, color: 'from-rose-500 to-red-500' },
  ];

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      // Fetch from API (currently mock)
      const hour = new Date().getHours();
      const mockSuggestions: any[] = [];

      // Time-based smart suggestion
      if (hour >= 8 && hour < 12) {
        mockSuggestions.push({
          id: 'morning-1',
          title: 'Check overnight updates',
          description: 'Your morning routine',
          command: 'Show overnight activity',
          relevance: 0.95,
        });
      } else if (hour >= 12 && hour < 17) {
        mockSuggestions.push({
          id: 'afternoon-1',
          title: 'Review today\'s progress',
          description: 'Mid-day check-in',
          command: 'Analyze today\'s performance',
          relevance: 0.88,
        });
      } else {
        mockSuggestions.push({
          id: 'evening-1',
          title: 'Daily summary',
          description: 'Wrap up your day',
          command: 'Generate daily summary',
          relevance: 0.92,
        });
      }

      setSuggestions(mockSuggestions);

      // Mock stats
      setQuickStats({
        commandsToday: 12,
        timeSaved: '2.5h',
        successRate: 98,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    const parsed = parseCommand(action.command);
    onCommandExecute?.(parsed);
  };

  const handleSuggestionClick = (suggestion: any) => {
    const parsed = parseCommand(suggestion.command);
    onCommandExecute?.(parsed);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary Command Input */}
      <div className="glass rounded-2xl p-6 shadow-xl">
        <CommandCenter onCommandExecute={onCommandExecute} autoFocus={true} />
      </div>

      {/* Smart Suggestions (if any) */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-text-muted">Suggested for you</h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {suggestions.slice(0, 2).map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="glass interactive rounded-xl p-4 text-left transition-all hover:border-[rgb(var(--accent))]/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-text mb-1">
                      {suggestion.title}
                    </h4>
                    <p className="text-sm text-text-muted">{suggestion.description}</p>
                  </div>
                  <div className="flex-shrink-0 ml-3">
                    <div className="rounded-full bg-[rgb(var(--accent))]/20 px-2 py-1 text-xs font-medium text-[rgb(var(--accent))]">
                      {Math.round(suggestion.relevance * 100)}%
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-text-muted">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="glass interactive rounded-xl p-4 transition-all hover:border-[rgb(var(--accent))]/50"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${action.color} mb-3`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-medium text-text">{action.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collapsible Advanced Section */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-card/5 px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:bg-card/10"
        >
          <span>Activity & Statistics</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        <div
          className={`collapsible ${showAdvanced ? 'expanded' : 'collapsed'}`}
          style={{
            maxHeight: showAdvanced ? '500px' : '0',
            transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out',
          }}
        >
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Commands Today */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CommandIcon className="h-4 w-4 text-blue-400" />
                <p className="text-xs text-text-muted">Commands Today</p>
              </div>
              <p className="text-2xl font-bold text-text">{quickStats.commandsToday}</p>
              <p className="text-xs text-green-400 mt-1">+3 vs yesterday</p>
            </div>

            {/* Time Saved */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <p className="text-xs text-text-muted">Time Saved</p>
              </div>
              <p className="text-2xl font-bold text-text">{quickStats.timeSaved}</p>
              <p className="text-xs text-green-400 mt-1">+30min this week</p>
            </div>

            {/* Success Rate */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <p className="text-xs text-text-muted">Success Rate</p>
              </div>
              <p className="text-2xl font-bold text-text">{quickStats.successRate}%</p>
              <p className="text-xs text-green-400 mt-1">+2% improvement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Used Agents */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CommandIcon className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-text-muted">Frequently Used</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {['dexter', 'cassie', 'kai'].map((agentId) => {
            const agent = REVOLUTIONARY_PERSONAS[agentId as keyof typeof REVOLUTIONARY_PERSONAS];
            if (!agent) return null;

            return (
              <button
                key={agentId}
                onClick={() => router.push(`/agents/${agentId}/chat`)}
                className="glass interactive flex items-center gap-2 rounded-full py-2 px-3 transition-all hover:border-[rgb(var(--accent))]/50"
              >
                <RevolutionaryAvatar personality={agent} size="sm" animated={false} showGlow={false} />
                <span className="text-sm font-medium text-text">{agent.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
