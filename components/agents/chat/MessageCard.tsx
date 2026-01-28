"use client";

import { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  Code,
  Table,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { ToolConfirmation } from './ToolConfirmation';
import { type ChatMessage, type MessageFeedback } from './types';
import { formatNumber, formatSeconds } from '@/lib/format-de';
import { useSanitizedAIResponse, usePlainText } from '@/lib/hooks/useSanitizedContent';

interface MessageCardProps {
  message: ChatMessage;
  onFeedback?: (messageId: string, feedback: MessageFeedback) => void;
  onReRun?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  /** Callback for confirming a tool action */
  onConfirmTool?: (messageId: string, toolName: string, args: Record<string, any>) => void;
  /** Callback for cancelling a tool action */
  onCancelTool?: (messageId: string) => void;
}

const messageTypeIcons = {
  text: null,
  code: Code,
  table: Table,
  chart: TrendingUp,
  'tool-output': ExternalLink,
  error: AlertCircle,
  confirmation: AlertTriangle,
};

export function MessageCard({
  message,
  onFeedback,
  onReRun,
  onCopy,
  onConfirmTool,
  onCancelTool,
}: MessageCardProps) {
  const [copied, setCopied] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const isUserMessage = message.role === 'user';
  const isSystemMessage = message.role === 'system';
  const TypeIcon = message.type !== 'text' ? messageTypeIcons[message.type] : null;

  // XSS Protection: Sanitize AI-generated content
  const sanitizedContent = useSanitizedAIResponse(message.content);
  const plainTextContent = usePlainText(message.content);

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (rating: 'positive' | 'negative') => {
    if (onFeedback) {
      onFeedback(message.id, { rating });
      setShowFeedbackForm(false);
    }
  };

  return (
    <div
      className={`group flex gap-3 ${
        isUserMessage ? 'flex-row-reverse' : 'flex-row'
      } ${isSystemMessage ? 'justify-center' : ''}`}
    >
      {/* Avatar (for agent messages) - Vibrant Enterprise */}
      {!isUserMessage && !isSystemMessage && (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/20">
          {message.agentName?.slice(0, 2).toUpperCase() || 'AI'}
        </div>
      )}

      {/* Message Content */}
      <div
        className={`flex max-w-[720px] flex-col gap-1 ${
          isUserMessage ? 'items-end' : 'items-start'
        } ${isSystemMessage ? 'max-w-full items-center' : ''}`}
      >
        {/* Agent Name + Metadata - Vibrant */}
        {!isUserMessage && !isSystemMessage && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{message.agentName}</span>
            {message.tokens !== undefined && (
              <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {formatNumber(message.tokens)} tokens
              </span>
            )}
            {message.latency !== undefined && (
              <span className="text-muted-foreground">
                {formatSeconds(message.latency, 1)}
              </span>
            )}
          </div>
        )}

        {/* Message Bubble - Vibrant Enterprise */}
        <div
          className={`
            relative rounded-xl px-4 py-3 text-sm shadow-sm
            ${
              isUserMessage
                ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/20'
                : isSystemMessage
                ? 'bg-muted text-muted-foreground italic'
                : message.type === 'error'
                ? 'border-2 border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-2 border-border bg-card text-foreground'
            }
          `}
        >
          {/* Type Icon */}
          {TypeIcon && (
            <TypeIcon
              className="mb-2 h-4 w-4 text-text-subtle"
              aria-hidden="true"
            />
          )}

          {/* Content with XSS Protection */}
          {message.type === 'code' ? (
            <pre className="overflow-x-auto">
              <code className="text-xs">{plainTextContent}</code>
            </pre>
          ) : message.type === 'table' ? (
            <div className="overflow-x-auto">
              {/* Placeholder for table rendering */}
              <div className="text-xs text-text-muted">[Tabelle wird angezeigt]</div>
            </div>
          ) : message.type === 'confirmation' && message.toolName && message.metadata?.args ? (
            // Render confirmation UI for destructive tool actions
            <ToolConfirmation
              toolName={message.toolName}
              displayName={message.metadata.displayName || message.toolName}
              args={message.metadata.args}
              isLoading={isConfirming}
              onConfirm={() => {
                if (onConfirmTool) {
                  setIsConfirming(true);
                  onConfirmTool(message.id, message.toolName!, message.metadata!.args);
                }
              }}
              onCancel={() => {
                if (onCancelTool) {
                  onCancelTool(message.id);
                }
              }}
            />
          ) : (
            // Render sanitized HTML safely (AI responses may contain markdown-formatted content)
            <div
              className="whitespace-pre-wrap break-words prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          )}

          {/* Tool Status Indicator */}
          {message.type === 'tool-output' && message.metadata?.status && (
            <div className={`mt-2 flex items-center gap-1.5 text-xs ${
              message.metadata.status === 'running'
                ? 'text-primary'
                : message.metadata.status === 'success'
                ? 'text-success'
                : 'text-error'
            }`}>
              {message.metadata.status === 'running' && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {message.metadata.status === 'success' && (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {message.metadata.status === 'error' && (
                <XCircle className="h-3 w-3" />
              )}
              {message.toolName}
            </div>
          )}

          {/* Tool Name (fallback for non-tool-output) */}
          {message.toolName && message.type !== 'tool-output' && (
            <div className="mt-2 flex items-center gap-1 text-xs text-text-subtle">
              <ExternalLink className="h-3 w-3" />
              {message.toolName}
            </div>
          )}

          {/* Timestamp */}
          <time
            className="mt-1 block text-xs text-text-subtle"
            dateTime={message.timestamp.toISOString()}
          >
            {message.timestamp.toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>

        {/* Actions (for agent messages) - Vibrant */}
        {!isUserMessage && !isSystemMessage && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Copy */}
            <button
              onClick={handleCopy}
              aria-label="Kopieren"
              className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Re-Run */}
            {onReRun && (
              <button
                onClick={() => onReRun(message.id)}
                aria-label="Erneut ausführen"
                className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Feedback */}
            {onFeedback && !message.feedback && (
              <>
                <button
                  onClick={() => handleFeedback('positive')}
                  aria-label="Positives Feedback"
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback('negative')}
                  aria-label="Negatives Feedback"
                  className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* Feedback Indicator */}
            {message.feedback && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  message.feedback.rating === 'positive'
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : 'text-red-500 bg-red-500/10'
                }`}
              >
                {message.feedback.rating === 'positive' ? '👍' : '👎'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Avatar (for user messages) - Vibrant */}
      {isUserMessage && (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-foreground border-2 border-border">
          DU
        </div>
      )}
    </div>
  );
}
