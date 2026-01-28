'use client';

import { useRouter } from 'next/navigation';
import { useSoundEffects } from '@/lib/agents/sound-engine';
import {
  Sparkles,
  BarChart3,
  Mail,
  Code,
  Users,
  Lightbulb,
  Zap,
  Command
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  command: string;
  agentId: string; // Agent to navigate to
  icon: typeof Sparkles;
  gradient: string;
  glow: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'analyze-sales',
    label: 'Analyze Sales',
    command: 'Analyze sales data for last quarter',
    agentId: 'dexter', // Data Analyst
    icon: BarChart3,
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    glow: 'rgba(99, 102, 241, 0.3)'
  },
  {
    id: 'send-update',
    label: 'Send Update',
    command: 'Send weekly update email',
    agentId: 'emmie', // Email Manager
    icon: Mail,
    gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    glow: 'rgba(236, 72, 153, 0.3)'
  },
  {
    id: 'review-code',
    label: 'Review Code',
    command: 'Review code for bugs',
    agentId: 'kai', // Code Assistant
    icon: Code,
    gradient: 'linear-gradient(135deg, #10b981, #14b8a6)',
    glow: 'rgba(16, 185, 129, 0.3)'
  },
  {
    id: 'team-meeting',
    label: 'Team Collab',
    command: 'Plan team collaboration session',
    agentId: 'cassie', // Customer Support / Collaboration
    icon: Users,
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    glow: 'rgba(245, 158, 11, 0.3)'
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm',
    command: 'Innovate new feature ideas',
    agentId: 'ari', // Creative Assistant
    icon: Lightbulb,
    gradient: 'linear-gradient(135deg, #eab308, #facc15)',
    glow: 'rgba(234, 179, 8, 0.3)'
  },
  {
    id: 'quick-task',
    label: 'Quick Task',
    command: 'Execute priority task',
    agentId: 'lex', // Legal / Task Assistant
    icon: Zap,
    gradient: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
    glow: 'rgba(6, 182, 212, 0.3)'
  },
];

export function QuickActions() {
  const router = useRouter();
  const sound = useSoundEffects();

  const handleAction = (action: QuickAction) => {
    sound.playClick();

    // Navigate to the agent chat with pre-filled command
    router.push(`/agents/${action.agentId}/chat?prompt=${encodeURIComponent(action.command)}`);
  };

  return (
    <div className="relative rounded-xl border-2 border-border bg-card p-6 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Vibrant Enterprise Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-purple-500" />

      <div className="mb-5 flex items-center gap-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <Command className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action, index) => {
          const Icon = action.icon;

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className="group relative overflow-hidden rounded-lg border-2 border-border bg-card p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-primary/30 hover:shadow-primary/5 animate-fadeInUp"
              style={{
                animationDelay: `${index * 0.1}s`
              }}
            >
              {/* Glow Effect on Hover */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-15 blur-2xl"
                style={{
                  background: action.gradient
                }}
              />

              {/* Content */}
              <div className="relative">
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ring-2 ring-background/50"
                  style={{
                    background: action.gradient,
                    boxShadow: `0 6px 24px ${action.glow}`
                  }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>

                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{action.label}</div>
                <div className="text-xs font-medium text-muted-foreground line-clamp-1 mt-0.5">
                  {action.command}
                </div>
              </div>

              {/* Shine Effect */}
              <div className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-r from-transparent via-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 shine-effect" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
