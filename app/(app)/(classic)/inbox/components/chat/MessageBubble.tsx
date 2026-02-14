'use client';

/**
 * Flowent Inbox v2 - Message Bubble Component
 * Renders individual chat messages with markdown support
 */

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Check, CheckCheck, Clock, AlertCircle, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/inbox';
import { DelegationCard } from './DelegationCard';
import { InlineChart } from './InlineChart';
import { DocumentCard } from './DocumentCard';

interface MessageBubbleProps {
  message: ChatMessage;
  agentColor?: string;
  showTimestamp?: boolean;
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessageBubbleComponent({
  message,
  agentColor = '#8b5cf6',
  showTimestamp = true,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Copy code to clipboard
  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Markdown components with syntax highlighting
  const markdownComponents = useMemo(
    () => ({
      code: ({ inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        if (!inline && match) {
          return (
            <div className="relative group my-2">
              <button
                onClick={() => copyToClipboard(codeString)}
                className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-100"
                title="Copy code"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="rounded-lg !bg-zinc-900 !my-0 text-sm"
                {...props}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        }

        return (
          <code
            className="px-1.5 py-0.5 rounded bg-zinc-800 text-violet-300 text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      },
      p: ({ children }: any) => (
        <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
      ),
      ul: ({ children }: any) => (
        <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
      ),
      ol: ({ children }: any) => (
        <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
      ),
      li: ({ children }: any) => <li className="text-sm">{children}</li>,
      strong: ({ children }: any) => (
        <strong className="font-semibold text-zinc-100">{children}</strong>
      ),
      a: ({ href, children }: any) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400 hover:text-violet-300 underline"
        >
          {children}
        </a>
      ),
      blockquote: ({ children }: any) => (
        <blockquote className="border-l-2 border-zinc-600 pl-3 my-2 text-zinc-400 italic">
          {children}
        </blockquote>
      ),
      table: ({ children }: any) => (
        <div className="overflow-x-auto my-2">
          <table className="min-w-full border border-zinc-700 rounded-lg overflow-hidden">
            {children}
          </table>
        </div>
      ),
      th: ({ children }: any) => (
        <th className="px-3 py-2 bg-zinc-800 text-left text-xs font-semibold text-zinc-300 border-b border-zinc-700">
          {children}
        </th>
      ),
      td: ({ children }: any) => (
        <td className="px-3 py-2 text-sm text-zinc-300 border-b border-zinc-800">
          {children}
        </td>
      ),
    }),
    []
  );

  // System messages
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="px-4 py-2 bg-zinc-900/50 border border-white/5 rounded-full">
          <p className="text-xs text-zinc-500">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex gap-3 mb-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
          style={{ backgroundColor: agentColor }}
        >
          {message.agentName?.charAt(0) || 'A'}
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[75%] min-w-0',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Agent name (for agent messages) */}
        {!isUser && message.agentName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-zinc-100">
              {message.agentName}
            </span>
            {showTimestamp && (
              <span className="text-xs text-zinc-500">
                {formatTime(message.timestamp)}
              </span>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-violet-600 text-white rounded-br-md'
              : 'bg-zinc-800/80 text-zinc-200 rounded-bl-md border border-white/5'
          )}
        >
          {message.isStreaming ? (
            <div className="flex items-center gap-2">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown components={markdownComponents}>
                  {message.content}
                </ReactMarkdown>
              </div>
              <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse rounded-sm" />
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* User message footer */}
        {isUser && (
          <div className="flex items-center gap-1.5 mt-1 justify-end">
            {showTimestamp && (
              <span className="text-xs text-zinc-500">
                {formatTime(message.timestamp)}
              </span>
            )}
            {/* Message status */}
            {message.isOptimistic ? (
              <Clock className="w-3 h-3 text-zinc-500" />
            ) : (
              <CheckCheck className="w-3 h-3 text-violet-400" />
            )}
          </div>
        )}

        {/* Tool calls — Glass Cockpit rich rendering */}
        {message.metadata?.toolCalls && message.metadata.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.metadata.toolCalls.map((tool: any) => {
              // Delegation → Rich DelegationCard
              if (tool.name === 'delegate_to_agent') {
                return <DelegationCard key={tool.id} tool={tool} />;
              }
              // Chart → Inline Chart.js rendering
              if (tool.name === 'render_chart' && tool.status === 'completed' && tool.result?.data?.chart_config) {
                return <InlineChart key={tool.id} tool={tool} />;
              }
              // Document → Rich Document Card
              if ((tool.name === 'draft_document' || tool.name === 'document_draft') && tool.status === 'completed' && (tool.result?.data?.document || tool.result?.data?.formatted_output)) {
                return <DocumentCard key={tool.id} tool={tool} />;
              }
              // Default → simple status line
              return (
                <div
                  key={tool.id}
                  className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 rounded-lg border border-white/5"
                >
                  {tool.status === 'running' ? (
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  ) : tool.status === 'completed' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : tool.status === 'failed' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  <span className="text-xs text-zinc-400 font-mono">
                    {tool.displayName || tool.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);
