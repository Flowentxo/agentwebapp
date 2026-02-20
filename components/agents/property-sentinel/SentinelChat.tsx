'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Loader2, Home, User, Sparkles, Paperclip,
  Search, ChevronRight, Zap, Workflow,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/store/session';

const AGENT_COLOR = '#92400E';
const AGENT_ID = 'property-sentinel';

// Specialty definitions matching the main chat page
const SPECIALTIES = [
  { name: 'Portal-Überwachung', icon: Search, desc: 'Immobilien-Portale automatisch nach neuen Inseraten scannen' },
  { name: 'Rendite-Analyse', icon: ChevronRight, desc: 'Rendite und Wirtschaftlichkeit per KI bewerten' },
  { name: 'Deal-Scoring', icon: Zap, desc: 'Top-Deals mit intelligenter Bewertung identifizieren' },
  { name: 'Pipeline-Integration', icon: Workflow, desc: 'Gefundene Objekte direkt in deine Pipeline einspeisen' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function SentinelChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { user } = useSession();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      abortRef.current = new AbortController();

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const res = await fetch(`/api/agents/${AGENT_ID}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(user.id ? { 'x-user-id': user.id } : {}),
        },
        body: JSON.stringify({ content: text }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.chunk) {
              accumulated += data.chunk;
              setStreamingContent(accumulated);
            }
            if (data.done) {
              const assistantMsg: Message = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: accumulated,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, assistantMsg]);
              setStreamingContent('');
            }
            if (data.error) {
              const errorMsg: Message = {
                id: `e-${Date.now()}`,
                role: 'assistant',
                content: `Fehler: ${data.error}`,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, errorMsg]);
              setStreamingContent('');
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: 'Verbindungsfehler. Bitte versuche es erneut.',
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      abortRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden" style={{ backgroundColor: '#030712' }}>
      {/* ============================================= */}
      {/* AMBIENT AGENT-COLOR GRADIENT                  */}
      {/* ============================================= */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 1100px 900px at 85% 95%, ${AGENT_COLOR}26, transparent 65%),
            radial-gradient(ellipse 600px 400px at 80% 90%, ${AGENT_COLOR}18, transparent 50%)
          `,
          filter: 'blur(1px)',
        }}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 relative z-10">
        {/* ============================================= */}
        {/* MISSION CONTROL GRID (Welcome Screen)         */}
        {/* ============================================= */}
        {messages.length === 0 && !streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            {/* Glowing Agent Icon */}
            <div className="relative mb-8">
              <div
                className="absolute -inset-5 rounded-full blur-2xl opacity-20"
                style={{ backgroundColor: AGENT_COLOR }}
              />
              <motion.div
                animate={{
                  boxShadow: [
                    `0 0 30px ${AGENT_COLOR}15, 0 0 60px ${AGENT_COLOR}08`,
                    `0 0 50px ${AGENT_COLOR}25, 0 0 80px ${AGENT_COLOR}12`,
                    `0 0 30px ${AGENT_COLOR}15, 0 0 60px ${AGENT_COLOR}08`,
                  ],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${AGENT_COLOR}12 0%, ${AGENT_COLOR}25 100%)`,
                  border: `1px solid ${AGENT_COLOR}20`,
                }}
              >
                <Home size={44} style={{ color: AGENT_COLOR }} />
              </motion.div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                style={{ backgroundColor: AGENT_COLOR, borderColor: '#030712' }}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Mission Title */}
            <h1 className="text-2xl font-bold text-white/90 mb-1">Bereit, Immobilien zu jagen.</h1>
            <p className="text-sm text-white/30 mb-8 max-w-md leading-relaxed">
              Autonomer Überwachungs-Bot für Immobilien-Portale mit KI-gestützter Deal-Bewertung und Pipeline-Integration.
            </p>

            {/* 2x2 Specialty Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
              {SPECIALTIES.map((spec, idx) => {
                const SpecIcon = spec.icon;
                return (
                  <motion.button
                    key={spec.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + idx * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => setInput(`Ich brauche Hilfe mit ${spec.name}`)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-start gap-4 p-6 rounded-2xl text-left group/cap transition-all cursor-pointer relative overflow-hidden"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${AGENT_COLOR}35`;
                      e.currentTarget.style.boxShadow = `0 0 40px ${AGENT_COLOR}12, inset 0 1px 0 ${AGENT_COLOR}15`;
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                  >
                    {/* Shimmer line at top on hover */}
                    <div
                      className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover/cap:opacity-100 transition-opacity duration-500"
                      style={{ background: `linear-gradient(90deg, transparent, ${AGENT_COLOR}60, transparent)` }}
                    />
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: `${AGENT_COLOR}10`,
                        border: `1px solid ${AGENT_COLOR}18`,
                      }}
                    >
                      <SpecIcon className="w-6 h-6" style={{ color: AGENT_COLOR }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white/80 group-hover/cap:text-white transition-colors mb-1.5">
                        {spec.name}
                      </div>
                      <div className="text-[11px] text-white/25 group-hover/cap:text-white/40 transition-colors leading-relaxed">
                        {spec.desc}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ============================================= */}
        {/* MESSAGES                                       */}
        {/* ============================================= */}
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${AGENT_COLOR}20` }}
                >
                  <Home className="w-3.5 h-3.5" style={{ color: AGENT_COLOR }} />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'text-white/80'
                    : 'text-white/70'
                }`}
                style={msg.role === 'user' ? {
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                } : {
                  background: `${AGENT_COLOR}06`,
                  border: `1px solid ${AGENT_COLOR}10`,
                }}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 bg-white/[0.06]">
                  <User className="w-3.5 h-3.5 text-white/40" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming partial */}
        {streamingContent && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div
              className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
              style={{ backgroundColor: `${AGENT_COLOR}20` }}
            >
              <Home className="w-3.5 h-3.5" style={{ color: AGENT_COLOR }} />
            </div>
            <div
              className="max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed text-white/70"
              style={{ background: `${AGENT_COLOR}06`, border: `1px solid ${AGENT_COLOR}10` }}
            >
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="inline-block ml-1 animate-pulse" style={{ color: AGENT_COLOR }}>|</span>
            </div>
          </motion.div>
        )}

        {/* Thinking indicator */}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3 items-center">
            <div
              className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: `${AGENT_COLOR}20` }}
            >
              <Home className="w-3.5 h-3.5" style={{ color: AGENT_COLOR }} />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs text-white/40"
              style={{ background: `${AGENT_COLOR}06`, border: `1px solid ${AGENT_COLOR}10` }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: AGENT_COLOR }} />
              Denkt nach...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ============================================= */}
      {/* FLOATING INPUT BAR                            */}
      {/* ============================================= */}
      <div className="px-6 pb-6 pt-3 shrink-0 relative z-10">
        <div
          className="flex items-end gap-2 rounded-2xl p-2.5 px-4 transition-all mx-auto max-w-3xl"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Agent indicator */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5"
            style={{
              backgroundColor: `${AGENT_COLOR}12`,
              border: `1px solid ${AGENT_COLOR}18`,
            }}
          >
            <Home size={18} style={{ color: AGENT_COLOR }} />
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Beschreibe deine Aufgabe..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none py-2.5 bg-transparent focus:outline-none disabled:opacity-50 placeholder:text-white/30 text-sm text-white/90"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />

          <button
            className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors mb-0.5 text-white/20 hover:text-white/50"
            title="Datei anhängen"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-2.5 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white"
            style={{
              backgroundColor: AGENT_COLOR,
              boxShadow: (!input.trim() || isStreaming)
                ? 'none'
                : `0 0 20px ${AGENT_COLOR}40, 0 0 40px ${AGENT_COLOR}20`,
            }}
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
