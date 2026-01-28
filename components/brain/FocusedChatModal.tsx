'use client';

/**
 * Focused Chat Modal
 * Allows users to chat with AI using only selected documents as context
 *
 * Features:
 * - Scoped RAG queries (only selected documents)
 * - Streaming responses
 * - Source attribution
 * - Context visualization
 *
 * @version 1.0.0
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Loader2,
  FileText,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type GraphNode } from '@/actions/brain-actions';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; title: string; relevance: number }>;
  timestamp: Date;
}

interface FocusedChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: GraphNode[];
  workspaceId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FocusedChatModal({
  isOpen,
  onClose,
  selectedDocuments,
  workspaceId = 'default-workspace',
}: FocusedChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showContext, setShowContext] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Document IDs for filtering
  const documentIds = selectedDocuments.map((doc) => doc.id);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/brain/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          query: userMessage.content,
          useSemanticSearch: true,
          filterDocumentIds: documentIds, // Only search in selected documents
          streamResponse: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Query failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let sources: Message['sources'] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.sources) {
                  sources = data.sources;
                } else if (data.chunk) {
                  accumulatedContent += data.chunk;
                  setStreamingContent(accumulatedContent);
                } else if (data.done) {
                  // Final message
                  const assistantMessage: Message = {
                    id: `msg-${Date.now() + 1}`,
                    role: 'assistant',
                    content: accumulatedContent,
                    sources,
                    timestamp: new Date(),
                  };
                  setMessages((prev) => [...prev, assistantMessage]);
                  setStreamingContent('');
                }
              } catch {
                // Text chunk without JSON
                accumulatedContent += line;
                setStreamingContent(accumulatedContent);
              }
            } else if (line.trim()) {
              accumulatedContent += line;
              setStreamingContent(accumulatedContent);
            }
          }
        }

        // If stream ended without done signal
        if (accumulatedContent && !messages.find((m) => m.content === accumulatedContent)) {
          const assistantMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: accumulatedContent,
            sources,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent('');
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        const errorMessage: Message = {
          id: `msg-error-${Date.now()}`,
          role: 'assistant',
          content: 'Es gab einen Fehler bei der Verarbeitung. Bitte versuche es erneut.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, documentIds, workspaceId, messages]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick prompts
  const quickPrompts = [
    'Was sind die wichtigsten Erkenntnisse?',
    'Fasse die Kernaussagen zusammen',
    'Welche Gemeinsamkeiten gibt es?',
    'Was sind die nächsten Schritte?',
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl h-[80vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Focused Chat</h2>
              <p className="text-xs text-muted-foreground">
                Chatte nur mit den {selectedDocuments.length} ausgewählten Dokumenten
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Context Panel (Collapsible) */}
        <div className="border-b border-zinc-800">
          <button
            onClick={() => setShowContext(!showContext)}
            className="w-full flex items-center justify-between px-6 py-3 text-sm text-muted-foreground hover:bg-zinc-800/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Kontext: {selectedDocuments.length} Dokumente
            </span>
            {showContext ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <AnimatePresence>
            {showContext && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-4 flex flex-wrap gap-2">
                  {selectedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: doc.color }}
                      />
                      <span className="text-xs text-gray-300 max-w-[150px] truncate">
                        {doc.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !streamingContent ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Brain className="h-16 w-16 text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Frag dein fokussiertes Wissen
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Die KI wird nur die {selectedDocuments.length} ausgewählten Dokumente
                als Kontext verwenden.
              </p>

              {/* Quick prompts */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInputValue(prompt)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-gray-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-800 border border-zinc-700'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                          Quellen
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {message.sources.map((source) => (
                            <span
                              key={source.id}
                              className="px-2 py-0.5 bg-zinc-900 rounded text-[10px] text-muted-foreground"
                            >
                              {source.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {streamingContent && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-zinc-800 border border-zinc-700">
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamingContent}
                      </ReactMarkdown>
                    </div>
                    <span className="inline-block ml-1 w-2 h-4 bg-indigo-400 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && !streamingContent && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Durchsuche ausgewählte Dokumente...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Frag dein fokussiertes Wissen..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default FocusedChatModal;
