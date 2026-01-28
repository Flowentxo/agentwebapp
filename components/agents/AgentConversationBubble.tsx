'use client';

import { AgentMessage } from '@/lib/agents/collaboration-engine';
import { REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';
import { RevolutionaryAvatar } from './RevolutionaryAvatar';
import { Brain, Zap, HelpCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { useSanitizedAIResponse } from '@/lib/hooks/useSanitizedContent';

interface AgentConversationBubbleProps {
  message: AgentMessage;
  isAnimating?: boolean;
}

export function AgentConversationBubble({
  message,
  isAnimating = false
}: AgentConversationBubbleProps) {
  const agent = REVOLUTIONARY_PERSONAS[message.agentId as keyof typeof REVOLUTIONARY_PERSONAS];

  // XSS Protection: Sanitize AI-generated message content
  const sanitizedContent = useSanitizedAIResponse(message.content);

  if (!agent) return null;

  const getMessageIcon = () => {
    switch (message.type) {
      case 'thought': return <Brain className="h-3 w-3" />;
      case 'action': return <Zap className="h-3 w-3" />;
      case 'question': return <HelpCircle className="h-3 w-3" />;
      case 'insight': return <Lightbulb className="h-3 w-3" />;
      case 'handoff': return <ArrowRight className="h-3 w-3" />;
      default: return <Brain className="h-3 w-3" />;
    }
  };

  const getMessageTypeLabel = () => {
    switch (message.type) {
      case 'thought': return 'Thinking';
      case 'action': return 'Acting';
      case 'question': return 'Asking';
      case 'insight': return 'Insight';
      case 'handoff': return 'Delegating';
      default: return 'Message';
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all duration-500 ${
        isAnimating ? 'animate-fadeInUp' : ''
      }`}
      style={{
        background: `linear-gradient(135deg, ${agent.colors.primary}08 0%, ${agent.colors.secondary}05 100%)`,
        borderColor: `${agent.colors.primary}20`,
        boxShadow: isAnimating
          ? `0 8px 32px ${agent.colors.glow}`
          : `0 2px 16px rgba(0,0,0,0.1)`
      }}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <RevolutionaryAvatar
          personality={agent}
          size="sm"
          animated={isAnimating}
          showGlow={isAnimating}
        />
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
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

          {/* Message Type Badge */}
          <span
            className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium"
            style={{
              background: `${agent.colors.secondary}20`,
              color: agent.colors.secondary,
              border: `1px solid ${agent.colors.secondary}30`
            }}
          >
            {getMessageIcon()}
            {getMessageTypeLabel()}
          </span>

          {/* Confidence Score */}
          {message.metadata?.confidence && (
            <div className="ml-auto flex items-center gap-1 text-xs text-text-muted">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-1 w-1 rounded-full"
                    style={{
                      backgroundColor: agent.colors.accent,
                      opacity: i < Math.floor(message.metadata!.confidence! * 5) ? 1 : 0.2
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Message Text with XSS Protection */}
        <div
          className="text-sm text-text leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Tags */}
        {message.metadata?.tags && message.metadata.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.metadata.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs"
                style={{
                  background: `${agent.colors.primary}10`,
                  color: agent.colors.primary
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-2 text-xs text-text-subtle">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
