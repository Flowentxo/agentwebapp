'use client';

/**
 * TrainerMode Component - Chat-Based Pipeline Editing
 *
 * Text input in cockpit sidebar for natural language pipeline modifications.
 * User types a change request → calls modify API → shows diff preview → applies on confirm.
 *
 * Part of Phase IV: Lifecycle Management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Check,
  X,
  Loader2,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Node, Edge } from 'reactflow';

// ============================================
// TYPES
// ============================================

interface TrainerModeProps {
  pipelineId: string;
  currentNodes: Node[];
  currentEdges: Edge[];
  userId: string;
  onApply: (nodes: Node[], edges: Edge[]) => void;
}

interface ModifyResponse {
  success: boolean;
  modifiedNodes?: Node[];
  modifiedEdges?: Node[];
  explanation?: string;
  changes?: string[];
  error?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  changes?: string[];
  hasDiff?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TrainerMode({
  pipelineId,
  currentNodes,
  currentEdges,
  userId,
  onApply,
}: TrainerModeProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingResult, setPendingResult] = useState<ModifyResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/modify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          currentNodes,
          currentEdges,
          modificationPrompt: prompt,
        }),
      });

      const data: ModifyResponse = await res.json();

      if (data.success) {
        setPendingResult(data);

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.explanation || 'Änderungen vorbereitet.',
          changes: data.changes,
          hasDiff: true,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Fehler: ${data.error || 'Änderung konnte nicht durchgeführt werden.'}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Verbindungsfehler. Bitte versuchen Sie es erneut.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, pipelineId, userId, currentNodes, currentEdges]);

  const handleApply = useCallback(() => {
    if (!pendingResult?.modifiedNodes || !pendingResult?.modifiedEdges) return;
    onApply(pendingResult.modifiedNodes as any, pendingResult.modifiedEdges as any);
    setPendingResult(null);

    const confirmMsg: ChatMessage = {
      id: `system-${Date.now()}`,
      role: 'assistant',
      content: 'Änderungen erfolgreich angewendet.',
    };
    setMessages((prev) => [...prev, confirmMsg]);
  }, [pendingResult, onApply]);

  const handleDiscard = useCallback(() => {
    setPendingResult(null);
    const discardMsg: ChatMessage = {
      id: `system-${Date.now()}`,
      role: 'assistant',
      content: 'Änderungen verworfen.',
    };
    setMessages((prev) => [...prev, discardMsg]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col border-t border-white/[0.04]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Trainer Modus
        </span>
      </div>

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-48 overflow-y-auto px-4 space-y-2 pb-2">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'text-xs rounded-lg px-3 py-2',
                  msg.role === 'user'
                    ? 'bg-violet-500/10 border border-violet-500/15 text-white/70 ml-6'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/60 mr-6'
                )}
              >
                <p>{msg.content}</p>

                {/* Change list */}
                {msg.changes && msg.changes.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {msg.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-white/40">
                        <span className="text-violet-400 mt-0.5">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Apply/Discard buttons */}
                {msg.hasDiff && pendingResult && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleApply}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Anwenden
                    </button>
                    <button
                      onClick={handleDiscard}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Verwerfen
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-white/30">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analysiere Änderung...
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 focus-within:border-violet-500/30 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pipeline ändern..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className={cn(
              'p-1.5 rounded-lg transition-all',
              input.trim() && !isLoading
                ? 'text-violet-400 hover:bg-violet-500/10'
                : 'text-white/15'
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrainerMode;
