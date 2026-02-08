'use client';

/**
 * Flowent Inbox v3 - MessageBubble Component
 * Individual message bubble with Grok-style design
 *
 * Features:
 * - User messages: right-aligned, dark background
 * - AI messages: left-aligned, subtle background, markdown support
 * - Streaming animation for AI responses
 * - Copy button on hover
 * - Timestamp on hover
 * - Approval request cards (HITL)
 * - Artifact cards with preview
 */

import { useState, memo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Bot, User, Copy, Check, FileCode, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { DecisionCard } from './chat/DecisionCard';
import { InlineToolActions, type ToolAction } from './chat/ToolSuggestionCard';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import { useWorkflowActions } from '@/lib/hooks/useWorkflowActions';
import { useToolActions } from '@/lib/hooks/useToolActions';
import type { ChatMessage, ArtifactType, ParsedToolAction } from '@/types/inbox';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  agentName?: string;
  agentColor?: string;
}

// Icon mapping for artifact types
const artifactIcons: Record<ArtifactType, React.ElementType> = {
  code: FileCode,
  markdown: FileText,
  email_draft: FileText,
  data_table: FileText,
  json: FileCode,
  html: FileCode,
};

// Code block with copy button component
function CodeBlock({ language, children }: { language?: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-white/[0.08]">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06]">
        <span className="text-[10px] font-mono text-white/40 uppercase font-medium">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-white/40 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded border border-white/[0.06] transition-all"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Syntax highlighted code */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#0d0d0d',
          fontSize: '0.75rem',
          lineHeight: 1.6,
        }}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
  agentName = 'AI Assistant',
  agentColor = '#8b5cf6',
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Zustand store for artifacts
  const { openArtifact, openArtifactById } = useInboxStore();

  // Workflow actions hook for approvals
  const { approveWorkflow, rejectWorkflow, isProcessing, processingId } = useWorkflowActions();

  // Tool actions hook for inline tool suggestions
  const {
    approveAction: approveToolAction,
    rejectAction: rejectToolAction,
    isProcessing: isToolProcessing,
    processingId: toolProcessingId,
    resolvedActions,
  } = useToolActions({ threadId: message.threadId });

  const isUser = message.role === 'user';
  const isApprovalRequest = message.type === 'approval_request' && message.approval;
  const isArtifactMessage = message.type === 'artifact' || !!message.artifact;
  const hasToolActions = !isUser && message.toolActions && message.toolActions.length > 0;

  // Convert ParsedToolAction to ToolAction format
  const toolActions: ToolAction[] = (message.toolActions || []).map((action) => ({
    id: action.id,
    type: action.type as ToolAction['type'],
    params: action.params,
    preview: action.preview,
  }));

  const timestamp = message.createdAt
    ? format(parseISO(message.createdAt), 'HH:mm')
    : '';

  // Handle approval
  const handleApprove = useCallback(async () => {
    if (!message.approval) return;
    await approveWorkflow({
      threadId: message.threadId,
      messageId: message.id,
      action: 'approve',
    });
  }, [message, approveWorkflow]);

  // Handle rejection
  const handleReject = useCallback(async (reason?: string) => {
    if (!message.approval) return;
    await rejectWorkflow({
      threadId: message.threadId,
      messageId: message.id,
      action: 'reject',
      comment: reason,
    });
  }, [message, rejectWorkflow]);

  // Handle artifact open
  const handleOpenArtifact = useCallback(() => {
    if (message.artifact) {
      openArtifact(message.artifact);
    } else if (message.metadata?.artifactId) {
      openArtifactById(message.metadata.artifactId as string);
    }
  }, [message, openArtifact, openArtifactById]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // =========================================================================
  // APPROVAL REQUEST - Render DecisionCard
  // =========================================================================
  if (isApprovalRequest) {
    return (
      <DecisionCard
        message={{
          ...message,
          timestamp: message.createdAt ? new Date(message.createdAt) : new Date(),
          agentName: agentName,
        }}
        agentColor={agentColor}
        onApprove={handleApprove}
        onReject={handleReject}
        isProcessing={isProcessing && processingId === message.id}
      />
    );
  }

  // =========================================================================
  // ARTIFACT MESSAGE - Render Artifact Card
  // =========================================================================
  if (isArtifactMessage && message.artifact) {
    const artifact = message.artifact;
    const ArtifactIcon = artifactIcons[artifact.type] || FileCode;

    return (
      <div
        className={cn(
          'group flex gap-3 px-4 py-3 transition-colors',
          'flex-row',
          showActions && 'bg-white/[0.02]'
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${agentColor}20` }}
        >
          <Bot className="w-4 h-4" style={{ color: agentColor }} />
        </div>

        {/* Artifact Card */}
        <div className="flex-1 min-w-0 max-w-[85%]">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-white/40">{agentName}</span>
            <span className="text-xs text-white/25">{timestamp}</span>
          </div>

          {/* Content with text */}
          {message.content && (
            <p className="text-sm text-white mb-2">{message.content}</p>
          )}

          {/* Artifact Card */}
          <button
            onClick={handleOpenArtifact}
            className={cn(
              'w-full max-w-sm p-3 rounded-xl transition-all duration-200',
              'bg-white/[0.03] border border-white/[0.08]',
              'hover:bg-white/[0.06] hover:border-violet-500/20',
              'flex items-center gap-3 text-left group/card'
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <ArtifactIcon className="w-5 h-5 text-violet-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {artifact.title || 'Untitled'}
              </p>
              <p className="text-xs text-white/40">
                {artifact.type.replace('_', ' ')}
                {artifact.language && ` • ${artifact.language}`}
                {artifact.metadata?.lineCount && ` • ${artifact.metadata.lineCount} lines`}
              </p>
            </div>

            {/* Open Icon */}
            <ExternalLink className="w-4 h-4 text-white/30 group-hover/card:text-violet-400 transition-colors" />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STANDARD MESSAGE - Regular text/markdown bubble
  // =========================================================================
  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 transition-colors',
        isUser ? 'flex-row-reverse' : 'flex-row',
        showActions && 'bg-white/[0.02]'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar with pulse animation when streaming */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative',
          isUser ? 'bg-white/[0.08]' : ''
        )}
        style={!isUser ? { backgroundColor: `${agentColor}20` } : undefined}
      >
        {/* Pulse ring for streaming */}
        {!isUser && isStreaming && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: agentColor }}
          />
        )}
        {isUser ? (
          <User className="w-4 h-4 text-white/50" />
        ) : (
          <Bot
            className={cn('w-4 h-4 relative z-10', isStreaming && 'animate-pulse')}
            style={{ color: agentColor }}
          />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 min-w-0 max-w-[80%]',
          isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 mb-1',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-xs font-medium text-white/40">
            {isUser ? 'You' : agentName}
          </span>
          <span className="text-xs text-white/25">{timestamp}</span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'relative rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-violet-500 text-white rounded-br-md'
              : 'bg-white/[0.03] text-white rounded-bl-md border border-white/[0.06]'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom code block with syntax highlighting and copy button
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');

                    // Block-level code: use CodeBlock with Prism highlighting
                    if (!inline && codeString.includes('\n') || match) {
                      return (
                        <CodeBlock language={match?.[1]}>
                          {codeString}
                        </CodeBlock>
                      );
                    }

                    // Inline code
                    return (
                      <code
                        className="bg-white/[0.06] text-violet-300 px-1.5 py-0.5 rounded border border-white/[0.08] text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  // Pre tag - let CodeBlock handle the styling
                  pre({ children }) {
                    return <>{children}</>;
                  },
                  // Minimalistic tables - Enterprise style
                  table({ children }) {
                    return (
                      <div className="my-3 overflow-x-auto rounded-xl border border-white/[0.08]">
                        <table className="w-full text-xs">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children }) {
                    return (
                      <thead className="bg-white/[0.04] text-white">
                        {children}
                      </thead>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="px-3 py-2 text-left font-semibold text-white/50 border-b border-white/[0.08]">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="px-3 py-2 text-white/80 border-b border-white/[0.04]">
                        {children}
                      </td>
                    );
                  },
                  tbody({ children }) {
                    return <tbody className="divide-y divide-white/[0.04]">{children}</tbody>;
                  },
                  tr({ children }) {
                    return (
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        {children}
                      </tr>
                    );
                  },
                  // Links
                  a({ children, href }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                      >
                        {children}
                      </a>
                    );
                  },
                  // Lists
                  ul({ children }) {
                    return <ul className="list-disc list-inside my-2 space-y-1 text-white/80">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal list-inside my-2 space-y-1 text-white/80">{children}</ol>;
                  },
                  li({ children }) {
                    return <li className="leading-relaxed">{children}</li>;
                  },
                  // Paragraphs
                  p({ children }) {
                    return <p className="my-1.5 leading-relaxed text-white/80">{children}</p>;
                  },
                  // Headings
                  h1({ children }) {
                    return <h1 className="text-lg font-semibold text-white mt-3 mb-2">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-base font-semibold text-white mt-3 mb-2">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-semibold text-white mt-2 mb-1">{children}</h3>;
                  },
                  // Blockquotes
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-[3px] border-violet-500/30 pl-3 my-2 text-white/50 italic">
                        {children}
                      </blockquote>
                    );
                  },
                  // Horizontal rule
                  hr() {
                    return <hr className="my-3 border-white/[0.06]" />;
                  },
                  // Strong/Bold
                  strong({ children }) {
                    return <strong className="font-semibold text-white">{children}</strong>;
                  },
                  // Emphasis/Italic
                  em({ children }) {
                    return <em className="italic text-white/60">{children}</em>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Streaming cursor */}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-violet-400 ml-1 animate-pulse rounded-sm" />
              )}
            </div>
          )}

          {/* Tool Action Suggestions */}
          {hasToolActions && !isStreaming && (
            <InlineToolActions
              actions={toolActions}
              agentName={agentName}
              agentColor={agentColor}
              onApprove={approveToolAction}
              onReject={rejectToolAction}
              isProcessing={isToolProcessing}
              processingId={toolProcessingId || undefined}
              resolvedActions={resolvedActions}
            />
          )}

          {/* Copy button */}
          {showActions && !isStreaming && (
            <button
              onClick={handleCopy}
              className={cn(
                'absolute -bottom-3 p-1.5 rounded-md transition-all',
                'bg-[#111] border border-white/[0.08] shadow-lg',
                'hover:bg-white/[0.06]',
                isUser ? '-left-2' : '-right-2'
              )}
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3 text-white/40" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
