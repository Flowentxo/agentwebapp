'use client';

import React from 'react';
import {
  Search,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mail,
  Hash,
  Send,
  Clock,
  User
} from 'lucide-react';

// ============================================================================
// LEVEL 10: TOOL INVOCATION DISPLAY COMPONENT
// ============================================================================

export interface ToolInvocationData {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: 'partial-call' | 'call' | 'result';
  result?: unknown;
}

interface ToolInvocationProps {
  invocation: ToolInvocationData;
  agentColor?: string;
}

// Tool-specific icons
const toolIcons: Record<string, React.ElementType> = {
  webSearch: Globe,
  sendEmail: Mail,
  sendSlackNotification: Hash,
};

export function ToolInvocation({ invocation, agentColor = '#6366f1' }: ToolInvocationProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const { toolName, args, state, result } = invocation;
  const Icon = toolIcons[toolName] || Search;

  const isLoading = state === 'partial-call' || state === 'call';
  const isComplete = state === 'result';
  const isSuccess = isComplete && (result as any)?.success !== false;

  return (
    <div className="tool-invocation" style={{ borderColor: agentColor }}>
      {/* Tool Header */}
      <div
        className="tool-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="tool-icon" style={{ backgroundColor: `${agentColor}20` }}>
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" style={{ color: agentColor }} />
          ) : (
            <Icon size={16} style={{ color: agentColor }} />
          )}
        </div>

        <div className="tool-info">
          <span className="tool-name">{formatToolName(toolName)}</span>
          <span className="tool-args">{formatToolArgs(args)}</span>
        </div>

        <div className="tool-status">
          {isLoading && (
            <span className="status-badge loading">Searching...</span>
          )}
          {isComplete && isSuccess && (
            <CheckCircle size={16} className="status-icon success" />
          )}
          {isComplete && !isSuccess && (
            <XCircle size={16} className="status-icon error" />
          )}
          {isComplete && (
            isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
          )}
        </div>
      </div>

      {/* Expanded Results */}
      {isExpanded && isComplete && result && (
        <div className="tool-results">
          <ToolResults toolName={toolName} result={result} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TOOL-SPECIFIC RESULT RENDERERS
// ============================================================================

interface ToolResultsProps {
  toolName: string;
  result: unknown;
}

function ToolResults({ toolName, result }: ToolResultsProps) {
  switch (toolName) {
    case 'webSearch':
      return <WebSearchResults result={result as WebSearchResult} />;
    case 'sendEmail':
      return <EmailResults result={result as EmailResult} />;
    case 'sendSlackNotification':
      return <SlackResults result={result as SlackResult} />;
    default:
      return <GenericResults result={result} />;
  }
}

// Web Search Result Types
interface WebSearchResult {
  success: boolean;
  query: string;
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  source: 'tavily' | 'mock';
  error?: string;
}

function WebSearchResults({ result }: { result: WebSearchResult }) {
  if (!result.success) {
    return (
      <div className="search-error">
        <XCircle size={16} />
        <span>Search failed: {result.error || 'Unknown error'}</span>
      </div>
    );
  }

  return (
    <div className="search-results">
      {/* Quick Answer (from Tavily) */}
      {result.answer && (
        <div className="search-answer">
          <strong>Quick Answer:</strong>
          <p>{result.answer}</p>
        </div>
      )}

      {/* Source indicator */}
      {result.source === 'mock' && (
        <div className="source-badge mock">
          Demo Mode - Configure TAVILY_API_KEY for real results
        </div>
      )}

      {/* Search Results */}
      <div className="results-list">
        {result.results.map((item, index) => (
          <div key={index} className="result-item">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="result-title"
            >
              {item.title}
              <ExternalLink size={12} />
            </a>
            <p className="result-content">{truncateText(item.content, 150)}</p>
            <span className="result-score">
              Relevance: {Math.round(item.score * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// LEVEL 12: EMAIL RESULT DISPLAY
// ============================================================================

interface EmailResult {
  success: boolean;
  messageId?: string;
  to: string;
  subject: string;
  status: 'sent' | 'queued' | 'failed';
  sentAt?: string;
  error?: string;
}

function EmailResults({ result }: { result: EmailResult }) {
  if (!result.success) {
    return (
      <div className="email-error">
        <XCircle size={16} />
        <span>Email failed: {result.error || 'Unknown error'}</span>
      </div>
    );
  }

  return (
    <div className="email-result">
      {/* Email Card */}
      <div className="email-card">
        <div className="email-header">
          <div className="email-icon">
            <Send size={20} />
          </div>
          <div className="email-status-badge success">
            <CheckCircle size={12} />
            {result.status === 'sent' ? 'Sent' : 'Queued'}
          </div>
        </div>

        <div className="email-details">
          <div className="email-field">
            <User size={14} />
            <span className="field-label">To:</span>
            <span className="field-value">{result.to}</span>
          </div>
          <div className="email-field">
            <Mail size={14} />
            <span className="field-label">Subject:</span>
            <span className="field-value">{result.subject}</span>
          </div>
          {result.sentAt && (
            <div className="email-field">
              <Clock size={14} />
              <span className="field-label">Sent:</span>
              <span className="field-value">{formatDateTime(result.sentAt)}</span>
            </div>
          )}
        </div>

        {result.messageId && (
          <div className="email-message-id">
            Message ID: {result.messageId}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LEVEL 12: SLACK RESULT DISPLAY
// ============================================================================

interface SlackResult {
  success: boolean;
  message: string;
  channel?: string;
  status: 'delivered' | 'pending' | 'failed';
  sentAt?: string;
  error?: string;
}

function SlackResults({ result }: { result: SlackResult }) {
  if (!result.success) {
    return (
      <div className="slack-error">
        <XCircle size={16} />
        <span>Slack notification failed: {result.error || 'Unknown error'}</span>
      </div>
    );
  }

  return (
    <div className="slack-result">
      {/* Slack Message Bubble */}
      <div className="slack-message-card">
        <div className="slack-header">
          <div className="slack-icon">
            <Hash size={20} />
          </div>
          <div className="slack-channel">
            {result.channel || '#general'}
          </div>
          <div className="slack-status-badge success">
            <CheckCircle size={12} />
            {result.status === 'delivered' ? 'Delivered' : 'Pending'}
          </div>
        </div>

        <div className="slack-message-bubble">
          <div className="slack-bot-avatar">
            <span>🤖</span>
          </div>
          <div className="slack-message-content">
            <div className="slack-bot-name">Flowent AI</div>
            <div className="slack-message-text">{result.message}</div>
            {result.sentAt && (
              <div className="slack-timestamp">{formatDateTime(result.sentAt)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericResults({ result }: { result: unknown }) {
  return (
    <pre className="generic-results">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatToolName(name: string): string {
  // Convert camelCase to Title Case with spaces
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatToolArgs(args: Record<string, unknown>): string {
  if (!args || Object.keys(args).length === 0) return '';

  // For webSearch, show the query
  if (args.query) {
    return `"${truncateText(String(args.query), 50)}"`;
  }

  // For sendEmail, show recipient and subject
  if (args.to && args.subject) {
    return `to ${args.to} - "${truncateText(String(args.subject), 30)}"`;
  }

  // For sendSlackNotification, show message preview
  if (args.message) {
    const channel = args.channel ? `${args.channel}: ` : '';
    return `${channel}"${truncateText(String(args.message), 40)}"`;
  }

  // For other tools, show first arg
  const firstValue = Object.values(args)[0];
  if (typeof firstValue === 'string') {
    return `"${truncateText(firstValue, 50)}"`;
  }

  return '';
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// ============================================================================
// STYLES (CSS-in-JS for component)
// ============================================================================

export const toolInvocationStyles = `
.tool-invocation {
  margin: 12px 0;
  border: 1px solid var(--border-color, #e5e7eb);
  border-left-width: 3px;
  border-radius: 8px;
  background: var(--bg-secondary, #f9fafb);
  overflow: hidden;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  transition: background 0.15s ease;
}

.tool-header:hover {
  background: var(--bg-tertiary, #f3f4f6);
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.tool-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tool-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary, #1f2937);
}

.tool-args {
  font-size: 12px;
  color: var(--text-secondary, #6b7280);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tool-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.status-badge.loading {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-icon.success {
  color: #10b981;
}

.status-icon.error {
  color: #ef4444;
}

.tool-results {
  padding: 16px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--bg-primary, #ffffff);
}

.search-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-size: 13px;
}

.search-answer {
  margin-bottom: 16px;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
}

.search-answer strong {
  color: #166534;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-answer p {
  margin-top: 8px;
  font-size: 14px;
  color: #14532d;
  line-height: 1.5;
}

.source-badge {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 12px;
  display: inline-block;
}

.source-badge.mock {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  padding: 12px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.result-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: #2563eb;
  text-decoration: none;
}

.result-title:hover {
  text-decoration: underline;
}

.result-content {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-secondary, #6b7280);
  line-height: 1.5;
}

.result-score {
  display: inline-block;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-tertiary, #9ca3af);
}

.generic-results {
  font-family: monospace;
  font-size: 12px;
  padding: 12px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================================================
   LEVEL 12: EMAIL STYLES
   ============================================================================ */

.email-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-size: 13px;
}

.email-result {
  padding: 0;
}

.email-card {
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  border: 1px solid #f9a8d4;
  border-radius: 12px;
  padding: 16px;
}

.email-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.email-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #ec4899;
  border-radius: 10px;
  color: white;
}

.email-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.email-status-badge.success {
  background: #d1fae5;
  color: #059669;
}

.email-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.email-field {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.email-field svg {
  color: #9ca3af;
  flex-shrink: 0;
}

.field-label {
  color: #6b7280;
  font-weight: 500;
  min-width: 60px;
}

.field-value {
  color: #1f2937;
  font-weight: 400;
}

.email-message-id {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f9a8d4;
  font-size: 11px;
  color: #9ca3af;
  font-family: monospace;
}

/* ============================================================================
   LEVEL 12: SLACK STYLES
   ============================================================================ */

.slack-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-size: 13px;
}

.slack-result {
  padding: 0;
}

.slack-message-card {
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
  border: 1px solid #c084fc;
  border-radius: 12px;
  padding: 16px;
}

.slack-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.slack-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #7c3aed;
  border-radius: 10px;
  color: white;
}

.slack-channel {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: #5b21b6;
}

.slack-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.slack-status-badge.success {
  background: #d1fae5;
  color: #059669;
}

.slack-message-bubble {
  display: flex;
  gap: 12px;
  background: white;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
}

.slack-bot-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.slack-message-content {
  flex: 1;
  min-width: 0;
}

.slack-bot-name {
  font-weight: 700;
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 4px;
}

.slack-message-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  word-wrap: break-word;
}

.slack-timestamp {
  margin-top: 8px;
  font-size: 11px;
  color: #9ca3af;
}
`;
