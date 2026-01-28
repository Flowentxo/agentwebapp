'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Clock } from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'action' | 'insight' | 'connection' | 'warning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string;
  actionUrl?: string;
}

export function ContextSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: '1',
      type: 'action',
      title: 'Review Unanswered Learning Questions',
      description: 'You have 3 unanswered daily questions. Take 5 minutes to reflect and answer.',
      priority: 'high',
      actionLabel: 'Answer Now',
      actionUrl: '#learning-questions',
    },
    {
      id: '2',
      type: 'insight',
      title: 'Document Upload Pattern Detected',
      description: 'You\'ve uploaded 5 documents this week. Consider creating a summary report.',
      priority: 'medium',
      actionLabel: 'Generate Summary',
      actionUrl: '#documents',
    },
    {
      id: '3',
      type: 'connection',
      title: 'Related Business Idea Found',
      description: 'Your recent activity aligns with the "Automate Workflows" idea. Time to implement?',
      priority: 'medium',
      actionLabel: 'View Idea',
      actionUrl: '#business-ideas',
    },
  ]);

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'border-gray-500/30 bg-muted/500/10',
      medium: 'border-yellow-500/30 bg-yellow-500/10',
      high: 'border-red-500/30 bg-red-500/10',
    };
    return colors[priority] || colors.medium;
  };

  const getTypeIcon = (type: string) => {
    return <Sparkles className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h3 className="text-white font-semibold">Context-Aware Suggestions</h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`rounded-lg border p-4 ${getPriorityColor(suggestion.priority)} transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card/10 flex-shrink-0">
                {getTypeIcon(suggestion.type)}
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium text-sm mb-1">{suggestion.title}</h4>
                <p className="text-muted-foreground text-xs mb-3">{suggestion.description}</p>
                {suggestion.actionLabel && (
                  <a
                    href={suggestion.actionUrl}
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {suggestion.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
