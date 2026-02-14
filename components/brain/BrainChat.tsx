/**
 * Brain AI v3.0 - Streaming Chat Interface
 *
 * Features:
 * - Real-time streaming responses (SSE)
 * - RAG source visualization with citations
 * - Context injection (@mentions)
 * - Multi-model support
 * - Trust engineering (source transparency)
 */

'use client';

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import {
  Brain,
  Send,
  Loader2,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  AtSign,
  Hash,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ============================================
// TYPES
// ============================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: RAGSource[];
  model?: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
}

interface RAGSource {
  id: string;
  title: string;
  excerpt: string;
  url?: string;
  provider?: string;
  score: number;
  chunk?: string;
}

interface ContextItem {
  id: string;
  type: 'document' | 'project' | 'person';
  name: string;
}

interface BrainChatProps {
  workspaceId?: string;
  initialQuery?: string;
  initialAction?: string;
  compact?: boolean;
}

// ============================================
// BRAIN CHAT COMPONENT
// ============================================

export function BrainChat({
  workspaceId = 'default-workspace',
  initialQuery,
  initialAction,
  compact = false,
}: BrainChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Handle initial action
  useEffect(() => {
    if (initialQuery && initialAction) {
      handleSubmit(new Event('submit') as unknown as FormEvent);
    }
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Add context item
  const addContextItem = useCallback((item: ContextItem) => {
    setContextItems(prev => {
      if (prev.some(i => i.id === item.id)) return prev;
      return [...prev, item];
    });
    setShowContextMenu(false);
  }, []);

  // Remove context item
  const removeContextItem = useCallback((id: string) => {
    setContextItems(prev => prev.filter(i => i.id !== id));
  }, []);

  // Submit message
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/brain/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({
          query: input,
          workspaceId,
          context: contextItems.map(c => c.id),
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let sources: RAGSource[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                fullContent += data.chunk;
                setStreamingContent(fullContent);
              }

              if (data.sources) {
                sources = data.sources;
              }

              if (data.done) {
                const assistantMessage: ChatMessage = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: fullContent,
                  sources,
                  model: data.model || 'gpt-4o-mini',
                  timestamp: new Date(),
                };

                setMessages(prev => [...prev, assistantMessage]);
                setStreamingContent('');
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('[BRAIN_CHAT] Parse error:', parseError);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[BRAIN_CHAT] Request aborted');
      } else {
        console.error('[BRAIN_CHAT] Error:', error);
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request.',
          error: (error as Error).message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  }, [input, isLoading, workspaceId, contextItems]);

  // Cancel streaming
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setStreamingContent('');
  }, []);

  // Retry message
  const handleRetry = useCallback((message: ChatMessage) => {
    // Find the user message before this assistant message
    const index = messages.findIndex(m => m.id === message.id);
    if (index > 0) {
      const userMessage = messages[index - 1];
      if (userMessage.role === 'user') {
        setInput(userMessage.content);
        setMessages(prev => prev.slice(0, index - 1));
      }
    }
  }, [messages]);

  // Feedback
  const handleFeedback = useCallback((messageId: string, isPositive: boolean) => {
    console.log(`[BRAIN_CHAT] Feedback for ${messageId}: ${isPositive ? 'positive' : 'negative'}`);
  }, []);

  // Export chat as Markdown
  const handleExportChat = useCallback(() => {
    if (messages.length === 0) return;
    const md = messages.map(m => {
      const role = m.role === 'user' ? '**You**' : '**Brain AI**';
      return `${role} (${m.timestamp.toLocaleString('de-DE')}):\n\n${m.content}`;
    }).join('\n\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brain-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  // Slash commands
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const slashCommands = [
    { cmd: '/export', label: 'Export Chat', desc: 'Als Markdown exportieren', action: () => { handleExportChat(); setInput(''); setShowSlashMenu(false); } },
    { cmd: '/clear', label: 'Clear Chat', desc: 'Chatverlauf löschen', action: () => { setMessages([]); setInput(''); setShowSlashMenu(false); } },
    { cmd: '/summarize', label: 'Summarize', desc: 'Bisherige Konversation zusammenfassen', action: () => { setInput('Fasse die bisherige Konversation in 3 Bullet-Points zusammen.'); setShowSlashMenu(false); } },
  ];

  // Detect slash command
  useEffect(() => {
    if (input.startsWith('/') && input.length < 20) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, [input]);

  return (
    <div className={`brain-chat ${compact ? 'brain-chat-compact' : ''}`}>
      {/* Messages */}
      <div className="brain-chat-messages" style={compact ? { maxHeight: '320px' } : undefined}>
        {messages.length === 0 && !streamingContent && (
          <div className="brain-chat-welcome">
            {!compact && (
              <>
                <div className="brain-chat-welcome-icon">
                  <Brain className="w-12 h-12" />
                </div>
                <h2>Brain AI</h2>
              </>
            )}
            <p>{compact ? 'Frag dein Gehirn – Konversation bleibt erhalten.' : 'Ask me anything about your workspace. I can search documents, analyze data, and help you write.'}</p>
            <div className="brain-chat-suggestions">
              <button onClick={() => setInput('What were the key decisions from last week?')}>
                Key decisions from last week
              </button>
              <button onClick={() => setInput('Summarize the current project status')}>
                Summarize project status
              </button>
              {!compact && (
                <button onClick={() => setInput('Help me write a project update email')}>
                  Write project update
                </button>
              )}
            </div>
          </div>
        )}

        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onCopy={handleCopy}
            onRetry={handleRetry}
            onFeedback={handleFeedback}
            copiedId={copiedId}
          />
        ))}

        {/* Streaming message */}
        {streamingContent && (
          <div className="brain-chat-message brain-chat-message-assistant">
            <div className="brain-chat-message-avatar">
              <Brain className="w-5 h-5" />
            </div>
            <div className="brain-chat-message-content">
              <ReactMarkdown>{streamingContent}</ReactMarkdown>
              <span className="brain-chat-streaming-indicator">●</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Bar */}
      {contextItems.length > 0 && (
        <div className="brain-chat-context">
          <span className="brain-chat-context-label">Context:</span>
          {contextItems.map(item => (
            <div key={item.id} className="brain-chat-context-item">
              {item.type === 'document' && <FileText className="w-3 h-3" />}
              <span>{item.name}</span>
              <button onClick={() => removeContextItem(item.id)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Slash Command Menu */}
      {showSlashMenu && (
        <div className="brain-chat-slash-menu">
          {slashCommands
            .filter(c => c.cmd.startsWith(input.toLowerCase()) || input === '/')
            .map(cmd => (
              <button
                key={cmd.cmd}
                onClick={cmd.action}
                className="brain-chat-slash-item"
              >
                <span className="brain-chat-slash-cmd">{cmd.cmd}</span>
                <span className="brain-chat-slash-desc">{cmd.desc}</span>
              </button>
            ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="brain-chat-input-container">
        <div className="brain-chat-input-wrapper">
          {/* Export button */}
          {messages.length > 0 && !compact && (
            <button
              type="button"
              className="brain-chat-context-button"
              onClick={handleExportChat}
              title="Export chat"
            >
              <Hash className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            className="brain-chat-context-button"
            onClick={() => setShowContextMenu(!showContextMenu)}
            title="Add context"
          >
            <AtSign className="w-4 h-4" />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask Brain AI..."
            className="brain-chat-input"
            rows={1}
            disabled={isLoading}
          />

          {isLoading ? (
            <button
              type="button"
              onClick={handleCancel}
              className="brain-chat-cancel-button"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="brain-chat-send-button"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="brain-chat-disclaimer">
          Brain AI can make mistakes. Consider verifying important information.
        </p>
      </form>

      <style jsx global>{`
        .brain-chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg-primary, #0f0f1a);
        }

        .brain-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .brain-chat-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px;
          color: var(--text-secondary, #999);
        }

        .brain-chat-welcome-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          border-radius: 24px;
          color: white;
          margin-bottom: 24px;
        }

        .brain-chat-welcome h2 {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 8px;
        }

        .brain-chat-welcome p {
          max-width: 400px;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .brain-chat-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .brain-chat-suggestions button {
          padding: 8px 16px;
          background: var(--bg-secondary, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 20px;
          color: var(--text-secondary, #999);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .brain-chat-suggestions button:hover {
          border-color: var(--color-primary, #7c3aed);
          color: var(--color-primary, #7c3aed);
        }

        .brain-chat-message {
          display: flex;
          gap: 12px;
          max-width: 800px;
        }

        .brain-chat-message-user {
          margin-left: auto;
          flex-direction: row-reverse;
        }

        .brain-chat-message-avatar {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .brain-chat-message-assistant .brain-chat-message-avatar {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
        }

        .brain-chat-message-user .brain-chat-message-avatar {
          background: var(--bg-tertiary, #2a2a4a);
          color: var(--text-secondary, #999);
        }

        .brain-chat-message-content {
          flex: 1;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 15px;
          line-height: 1.6;
        }

        .brain-chat-message-assistant .brain-chat-message-content {
          background: var(--bg-secondary, #1a1a2e);
          color: var(--text-primary, #fff);
        }

        .brain-chat-message-user .brain-chat-message-content {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
        }

        .brain-chat-message-content pre {
          background: var(--bg-tertiary, #0a0a14);
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 12px 0;
        }

        .brain-chat-message-content code {
          font-family: 'Fira Code', monospace;
          font-size: 13px;
        }

        .brain-chat-streaming-indicator {
          display: inline-block;
          margin-left: 4px;
          color: var(--color-primary, #7c3aed);
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .brain-chat-context {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-secondary, #1a1a2e);
          border-top: 1px solid var(--border-color, #2a2a4a);
          overflow-x: auto;
        }

        .brain-chat-context-label {
          font-size: 12px;
          color: var(--text-tertiary, #666);
          white-space: nowrap;
        }

        .brain-chat-context-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 6px;
          font-size: 12px;
          color: var(--text-secondary, #999);
          white-space: nowrap;
        }

        .brain-chat-context-item button {
          background: none;
          border: none;
          padding: 2px;
          cursor: pointer;
          color: var(--text-tertiary, #666);
          display: flex;
        }

        .brain-chat-context-item button:hover {
          color: var(--color-error, #ef4444);
        }

        .brain-chat-input-container {
          padding: 16px;
          background: var(--bg-secondary, #1a1a2e);
          border-top: 1px solid var(--border-color, #2a2a4a);
        }

        .brain-chat-input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 12px;
          background: var(--bg-primary, #0f0f1a);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 12px;
          transition: border-color 0.2s;
        }

        .brain-chat-input-wrapper:focus-within {
          border-color: var(--color-primary, #7c3aed);
        }

        .brain-chat-context-button {
          background: none;
          border: none;
          padding: 8px;
          color: var(--text-tertiary, #666);
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .brain-chat-context-button:hover {
          background: var(--bg-secondary, #1a1a2e);
          color: var(--color-primary, #7c3aed);
        }

        .brain-chat-input {
          flex: 1;
          background: transparent;
          border: none;
          resize: none;
          font-size: 15px;
          color: var(--text-primary, #fff);
          outline: none;
          min-height: 24px;
          max-height: 120px;
        }

        .brain-chat-input::placeholder {
          color: var(--text-tertiary, #666);
        }

        .brain-chat-send-button,
        .brain-chat-cancel-button {
          padding: 8px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .brain-chat-send-button {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
        }

        .brain-chat-send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .brain-chat-send-button:not(:disabled):hover {
          transform: scale(1.05);
        }

        .brain-chat-cancel-button {
          background: var(--color-error, #ef4444);
          color: white;
        }

        .brain-chat-disclaimer {
          margin-top: 8px;
          text-align: center;
          font-size: 11px;
          color: var(--text-tertiary, #666);
        }

        .brain-chat-slash-menu {
          padding: 4px 16px;
          border-top: 1px solid var(--border-color, #2a2a4a);
          background: var(--bg-secondary, #1e1e3a);
          display: flex;
          flex-direction: column;
        }

        .brain-chat-slash-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s;
        }

        .brain-chat-slash-item:hover {
          background: var(--bg-tertiary, #2a2a4a);
        }

        .brain-chat-slash-cmd {
          font-size: 13px;
          font-weight: 600;
          color: #a855f7;
          font-family: monospace;
          min-width: 80px;
        }

        .brain-chat-slash-desc {
          font-size: 12px;
          color: var(--text-tertiary, #666);
        }

        .brain-chat-compact .brain-chat-messages {
          padding: 12px;
          gap: 12px;
        }

        .brain-chat-compact .brain-chat-welcome {
          padding: 16px;
        }

        .brain-chat-compact .brain-chat-input-container {
          padding: 8px 12px;
        }
      `}</style>
    </div>
  );
}

// ============================================
// MESSAGE BUBBLE COMPONENT
// ============================================

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy: (text: string, id: string) => void;
  onRetry: (message: ChatMessage) => void;
  onFeedback: (id: string, isPositive: boolean) => void;
  copiedId: string | null;
}

function MessageBubble({
  message,
  onCopy,
  onRetry,
  onFeedback,
  copiedId,
}: MessageBubbleProps) {
  const [showSources, setShowSources] = useState(false);

  return (
    <div
      className={`brain-chat-message brain-chat-message-${message.role}`}
    >
      <div className="brain-chat-message-avatar">
        {message.role === 'assistant' ? (
          <Brain className="w-5 h-5" />
        ) : (
          <span>You</span>
        )}
      </div>

      <div className="brain-chat-message-wrapper">
        <div className="brain-chat-message-content">
          {message.error ? (
            <div className="brain-chat-error">
              <AlertCircle className="w-4 h-4" />
              <span>{message.content}</span>
            </div>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="brain-chat-sources">
            <button
              className="brain-chat-sources-toggle"
              onClick={() => setShowSources(!showSources)}
            >
              <FileText className="w-4 h-4" />
              <span>{message.sources.length} sources</span>
              {showSources ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showSources && (
              <div className="brain-chat-sources-list">
                {message.sources.map((source, index) => (
                  <SourceCard key={source.id || index} source={source} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {message.role === 'assistant' && !message.error && (
          <div className="brain-chat-actions">
            <button
              onClick={() => onCopy(message.content, message.id)}
              title="Copy"
            >
              {copiedId === message.id ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button onClick={() => onRetry(message)} title="Retry">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onFeedback(message.id, true)}
              title="Good response"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onFeedback(message.id, false)}
              title="Bad response"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
            {message.model && (
              <span className="brain-chat-model-badge">{message.model}</span>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .brain-chat-message-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .brain-chat-error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-error, #ef4444);
        }

        .brain-chat-sources {
          margin-top: 8px;
        }

        .brain-chat-sources-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-tertiary, #2a2a4a);
          border: none;
          border-radius: 8px;
          color: var(--text-secondary, #999);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .brain-chat-sources-toggle:hover {
          background: var(--bg-tertiary, #3a3a5a);
        }

        .brain-chat-sources-list {
          display: grid;
          gap: 8px;
          margin-top: 8px;
        }

        .brain-chat-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }

        .brain-chat-actions button {
          padding: 6px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--text-tertiary, #666);
          cursor: pointer;
          transition: all 0.2s;
        }

        .brain-chat-actions button:hover {
          background: var(--bg-tertiary, #2a2a4a);
          color: var(--text-primary, #fff);
        }

        .brain-chat-model-badge {
          margin-left: auto;
          padding: 2px 8px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 4px;
          font-size: 10px;
          color: var(--text-tertiary, #666);
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}

// ============================================
// SOURCE CARD COMPONENT
// ============================================

interface SourceCardProps {
  source: RAGSource;
}

function SourceCard({ source }: SourceCardProps) {
  return (
    <div className="source-card">
      <div className="source-card-header">
        <FileText className="w-4 h-4" />
        <span className="source-card-title">{source.title}</span>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-card-link"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <p className="source-card-excerpt">{source.excerpt}</p>
      <div className="source-card-meta">
        {source.provider && (
          <span className="source-card-provider">{source.provider}</span>
        )}
        <span className="source-card-score">
          {Math.round(source.score * 100)}% relevant
        </span>
      </div>

      <style jsx>{`
        .source-card {
          padding: 12px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 8px;
          border: 1px solid var(--border-color, #3a3a5a);
        }

        .source-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .source-card-title {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .source-card-link {
          color: var(--color-primary, #7c3aed);
          padding: 4px;
          border-radius: 4px;
          display: flex;
        }

        .source-card-link:hover {
          background: rgba(124, 58, 237, 0.2);
        }

        .source-card-excerpt {
          font-size: 12px;
          color: var(--text-secondary, #999);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .source-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .source-card-provider {
          padding: 2px 6px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 4px;
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-tertiary, #666);
        }

        .source-card-score {
          font-size: 11px;
          color: var(--color-primary, #7c3aed);
        }
      `}</style>
    </div>
  );
}

export default BrainChat;
