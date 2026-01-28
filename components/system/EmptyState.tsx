'use client';

/**
 * EMPTY STATE - OPPORTUNITY, NOT VOID
 *
 * "Empty states are not failures - they're invitations."
 *
 * Beautiful empty states that guide users forward with clarity and encouragement.
 */

import { ReactNode } from 'react';
import { LucideIcon, Inbox, MessageSquare, Search, Zap, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  variant?: 'default' | 'success' | 'info' | 'warning';
  fullScreen?: boolean;
  children?: ReactNode;
}

const variantColors = {
  default: {
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    glow: 'rgba(99, 102, 241, 0.4)'
  },
  success: {
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #10B981 100%)',
    glow: 'rgba(6, 182, 212, 0.4)'
  },
  info: {
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    glow: 'rgba(6, 182, 212, 0.4)'
  },
  warning: {
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',
    glow: 'rgba(245, 158, 11, 0.4)'
  }
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  variant = 'default',
  fullScreen = false,
  children
}: EmptyStateProps) {
  const ActionIcon = action?.icon || Sparkles;
  const colors = variantColors[variant];

  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center p-6'
    : 'flex items-center justify-center p-12';

  return (
    <div className={containerClass} style={fullScreen ? { background: 'var(--background)' } : {}}>
      {fullScreen && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      )}

      <div className="relative max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: colors.gradient,
              boxShadow: `0 20px 60px ${colors.glow}`,
            }}
          >
            <Icon className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-4xl font-bold text-white mb-4 animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          {title}
        </h2>

        {/* Description */}
        <p
          className="text-xl text-muted-foreground mb-8 max-w-lg mx-auto animate-fade-in"
          style={{ animationDelay: '0.2s' }}
        >
          {description}
        </p>

        {/* Custom Children */}
        {children && (
          <div
            className="mb-8 animate-fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            {children}
          </div>
        )}

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="px-10 py-5 rounded-2xl font-bold text-white transition-all duration-300 hover:scale-105 inline-flex items-center gap-3 animate-fade-in"
            style={{
              background: colors.gradient,
              boxShadow: `0 8px 32px ${colors.glow}`,
              animationDelay: '0.4s'
            }}
          >
            <ActionIcon className="h-5 w-5" />
            {action.label}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

// Preset Empty States
export function NoConversationsState({ onAction }: { onAction: () => void }) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="Ready for your first chat?"
      description="Start a conversation with one of our AI agents to see it appear here"
      action={{
        label: 'Browse Agents',
        onClick: onAction,
        icon: Sparkles
      }}
      variant="info"
    />
  );
}

export function NoSearchResultsState({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try different keywords or adjust your filters.`}
      variant="default"
    />
  );
}

export function AllCaughtUpState() {
  return (
    <EmptyState
      icon={Inbox}
      title="All caught up!"
      description="No unread conversations at the moment. Take a breather - you've earned it."
      variant="success"
    />
  );
}

export function ConnectionErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={Zap}
      title="Connection lost"
      description="We're having trouble connecting to the server. Your data is safe, and we're working to restore the connection."
      action={{
        label: 'Try Again',
        onClick: onRetry,
        icon: Zap
      }}
      variant="warning"
    />
  );
}

export function NoWorkflowsState({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={Zap}
      title="Ready to automate?"
      description="Create your first workflow to automate repetitive tasks and boost productivity."
      action={{
        label: 'Create Workflow',
        onClick: onCreate,
        icon: Sparkles
      }}
      variant="info"
      fullScreen={false}
    />
  );
}
