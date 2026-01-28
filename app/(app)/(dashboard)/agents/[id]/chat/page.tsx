'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Send,
  Paperclip,
  Trash2,
  Download,
  MessageSquare,
  Plus,
  Clock,
  Sparkles,
  Circle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Search,
  Mail,
  FileText,
  Database,
  Zap,
  Brain,
  Eye,
  Edit3,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  // AI Tool Icons
  ListTodo,
  CalendarClock,
  Globe,
  MessageSquarePlus,
  User,
  Paperclip as AttachmentIcon,
  BellOff,
  Languages,
  AlarmClock,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAgentById, AgentPersona } from '@/lib/agents/personas';
import { useChatStore, ChatContext } from '@/store/chatStore';
import { ContextPill, ContextBanner } from '@/components/agents/chat/ContextPill';
import { AgentControlPanel, AgentConfig } from '@/components/agents/chat/AgentControlPanel';

// Types
interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  tokens?: number;
  costUsd?: string;
}

// Default Agent Configuration for Control Panel
const DEFAULT_AGENT_CONFIG: AgentConfig = {
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  activeTools: ['web_search', 'email_access', 'database_read', 'file_access'],
};

interface ToolCall {
  id: string;
  tool: string;
  displayName: string;
  status: 'running' | 'complete' | 'error';
  args?: Record<string, any>;
  result?: {
    success: boolean;
    summary?: string;
    error?: string;
    data?: any;
  };
  startedAt: Date;
  completedAt?: Date;
}

interface AgentThinking {
  phase: 'analyzing' | 'searching' | 'processing' | 'writing' | 'reviewing';
  description: string;
}

// Tool icon mapping
const getToolIcon = (toolName: string) => {
  const iconMap: Record<string, typeof Search> = {
    // Basic Gmail tools
    'gmail_search': Search,
    'gmail_read': Eye,
    'gmail_send': Mail,
    'gmail_reply': Mail,
    'gmail_draft': Edit3,
    'gmail_archive': Archive,
    'gmail_trash': Trash2,
    'gmail_label': FileText,
    'gmail_mark_read': Eye,
    'gmail_get_thread': MessageSquare,
    'gmail_stats': Database,
    // Batch operations
    'gmail_batch_archive': Archive,
    'gmail_batch_trash': Trash2,
    'gmail_batch_mark_read': Eye,
    'gmail_batch_label': FileText,
    // Templates
    'email_use_template': FileText,
    'email_list_templates': FileText,
    // AI-powered tools
    'gmail_summarize_inbox': Brain,
    'gmail_extract_action_items': ListTodo,
    'gmail_schedule_send': CalendarClock,
    'gmail_semantic_search': Brain,
    'gmail_generate_reply': MessageSquarePlus,
    'gmail_contact_history': User,
    'gmail_find_attachments': AttachmentIcon,
    'gmail_unsubscribe_suggestions': BellOff,
    'gmail_translate': Languages,
    'gmail_snooze': AlarmClock,
    // Legacy mappings
    'search_emails': Search,
    'read_email': Eye,
    'send_email': Mail,
    'draft_email': Edit3,
    'list_labels': FileText,
    'analyze_data': Database,
    'calculate': Zap,
    'research': Brain,
    'default': Zap,
  };
  return iconMap[toolName] || iconMap.default;
};

// Agent thinking phases based on tool calls
const getThinkingPhase = (toolName: string): AgentThinking => {
  const phases: Record<string, AgentThinking> = {
    // Basic Gmail tools
    'gmail_search': { phase: 'searching', description: 'Durchsucht E-Mails...' },
    'gmail_read': { phase: 'analyzing', description: 'Liest E-Mail-Inhalt...' },
    'gmail_send': { phase: 'processing', description: 'Sendet E-Mail...' },
    'gmail_reply': { phase: 'processing', description: 'Sendet Antwort...' },
    'gmail_draft': { phase: 'writing', description: 'Erstellt E-Mail-Entwurf...' },
    'gmail_archive': { phase: 'processing', description: 'Archiviert E-Mail...' },
    'gmail_trash': { phase: 'processing', description: 'Löscht E-Mail...' },
    'gmail_label': { phase: 'processing', description: 'Ändert Labels...' },
    'gmail_mark_read': { phase: 'processing', description: 'Markiert als gelesen...' },
    'gmail_get_thread': { phase: 'searching', description: 'Lädt E-Mail-Thread...' },
    'gmail_stats': { phase: 'analyzing', description: 'Ruft Statistiken ab...' },
    // Batch operations
    'gmail_batch_archive': { phase: 'processing', description: 'Archiviert mehrere E-Mails...' },
    'gmail_batch_trash': { phase: 'processing', description: 'Löscht mehrere E-Mails...' },
    'gmail_batch_mark_read': { phase: 'processing', description: 'Markiert mehrere als gelesen...' },
    'gmail_batch_label': { phase: 'processing', description: 'Ändert Labels...' },
    // Templates
    'email_use_template': { phase: 'writing', description: 'Wendet Vorlage an...' },
    'email_list_templates': { phase: 'searching', description: 'Lädt Vorlagen...' },
    // AI-powered tools
    'gmail_summarize_inbox': { phase: 'analyzing', description: 'Fasst Postfach zusammen...' },
    'gmail_extract_action_items': { phase: 'analyzing', description: 'Extrahiert Aufgaben...' },
    'gmail_schedule_send': { phase: 'processing', description: 'Plant E-Mail-Versand...' },
    'gmail_semantic_search': { phase: 'searching', description: 'Intelligente Suche läuft...' },
    'gmail_generate_reply': { phase: 'writing', description: 'Generiert Antwortvorschlag...' },
    'gmail_contact_history': { phase: 'searching', description: 'Lädt Kontakt-Historie...' },
    'gmail_find_attachments': { phase: 'searching', description: 'Sucht Anhänge...' },
    'gmail_unsubscribe_suggestions': { phase: 'analyzing', description: 'Analysiert Newsletter...' },
    'gmail_translate': { phase: 'processing', description: 'Übersetzt E-Mail...' },
    'gmail_snooze': { phase: 'processing', description: 'Verschiebt E-Mail...' },
    // Legacy mappings
    'search_emails': { phase: 'searching', description: 'Durchsucht E-Mails...' },
    'read_email': { phase: 'analyzing', description: 'Analysiert E-Mail-Inhalt...' },
    'send_email': { phase: 'processing', description: 'Sendet E-Mail...' },
    'draft_email': { phase: 'writing', description: 'Erstellt E-Mail-Entwurf...' },
    'list_labels': { phase: 'searching', description: 'Lädt E-Mail-Labels...' },
    'analyze_data': { phase: 'analyzing', description: 'Analysiert Daten...' },
    'calculate_roi': { phase: 'processing', description: 'Berechnet ROI...' },
    'calculate_break_even': { phase: 'processing', description: 'Berechnet Break-Even...' },
    'generate_cash_flow': { phase: 'processing', description: 'Erstellt Cashflow-Prognose...' },
    'generate_balance_sheet': { phase: 'processing', description: 'Erstellt Bilanz...' },
    'generate_pnl': { phase: 'processing', description: 'Erstellt GuV-Rechnung...' },
    'forecast_sales': { phase: 'analyzing', description: 'Erstellt Umsatzprognose...' },
    'default': { phase: 'processing', description: 'Verarbeitet Anfrage...' },
  };
  return phases[toolName] || phases.default;
};

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  preview: string;
}

// Agent greeting messages based on personality
const agentGreetings: Record<string, string[]> = {
  dexter: [
    "Hallo! Lass uns die Zahlen analysieren. Welche Daten soll ich für dich auswerten?",
    "Hey! Ich bin bereit, deine Finanzdaten zu durchleuchten. Was steht an?",
    "Willkommen! Zeit für datengetriebene Entscheidungen. Wie kann ich helfen?"
  ],
  cassie: [
    "Hi! Ich bin hier um zu helfen. Was kann ich für dich tun?",
    "Hallo! Erzähl mir, wobei du Unterstützung brauchst.",
    "Hey! Ich höre zu - was liegt dir auf dem Herzen?"
  ],
  emmie: [
    "Hallo! Sollen wir eine E-Mail verfassen oder eine Kampagne planen?",
    "Hi! Bereit, deine E-Mail-Kommunikation zu optimieren!",
    "Hey! Lass uns deine E-Mails auf das nächste Level bringen."
  ],
  kai: [
    "Hey! Welchen Code sollen wir heute schreiben?",
    "Hallo! Debug-Session oder neues Feature? Ich bin bereit!",
    "Hi! Lass uns coden. Was steht auf der Agenda?"
  ],
  lex: [
    "Guten Tag! Wie kann ich Sie bei rechtlichen Fragen unterstützen?",
    "Hallo! Vertrag, Compliance oder Risikobewertung - womit kann ich helfen?",
    "Willkommen! Welche rechtliche Angelegenheit soll ich prüfen?"
  ],
  default: [
    "Hallo! Wie kann ich dir heute helfen?",
    "Hi! Ich bin bereit. Was steht an?",
    "Hey! Lass uns loslegen. Was brauchst du?"
  ]
};

const getRandomGreeting = (agentId: string): string => {
  const greetings = agentGreetings[agentId] || agentGreetings.default;
  return greetings[Math.floor(Math.random() * greetings.length)];
};

export default function AgentChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  // Load agent data synchronously - no loading delay needed
  const agent = getAgentById(agentId);

  // Chat Sessions State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const [showControlPanel, setShowControlPanel] = useState(true);

  // Current Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Agent Action State - Tool calls and thinking indicators
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  const [completedToolCalls, setCompletedToolCalls] = useState<ToolCall[]>([]);
  const [currentThinking, setCurrentThinking] = useState<AgentThinking | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Context-Aware Handoff State
  const [handoffContext, setHandoffContext] = useState<ChatContext | null>(null);
  const consumeContext = useChatStore((state) => state.consumeContext);

  // Agent Configuration State (synced with Control Panel)
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat sessions from localStorage and create new chat
  useEffect(() => {
    if (!agentId) return;

    const storageKey = `chat-sessions-${agentId}`;
    const stored = localStorage.getItem(storageKey);

    let existingSessions: ChatSession[] = [];
    if (stored) {
      try {
        existingSessions = JSON.parse(stored).map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
      } catch (e) {
        console.error('Failed to parse chat sessions:', e);
      }
    }

    // Always start with a new chat session
    const newSession: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'Neuer Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      preview: ''
    };

    setChatSessions([newSession, ...existingSessions]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setTokenUsage({ input: 0, output: 0, total: 0 });
    setError(null);
  }, [agentId]);

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (!agentId || chatSessions.length === 0) return;

    const storageKey = `chat-sessions-${agentId}`;
    localStorage.setItem(storageKey, JSON.stringify(chatSessions));
  }, [chatSessions, agentId]);

  // =====================================================
  // CONTEXT-AWARE HANDOFF: Auto-detect and consume context
  // =====================================================
  useEffect(() => {
    // Check for context from store (e.g., from Budget Dashboard)
    const context = consumeContext();
    if (context) {
      console.log('[AgentChat] Received handoff context:', context.type, 'from', context.source);

      // Store context for display (ContextPill)
      setHandoffContext(context);

      // Auto-populate the input with the generated prompt
      if (context.initialPrompt) {
        setInputMessage(context.initialPrompt);
      }

      // Auto-send if configured
      if (context.metadata?.autoSend && context.initialPrompt) {
        // Slight delay to allow UI to update
        setTimeout(() => {
          handleSendMessage();
        }, 500);
      }
    }
  }, []); // Only run once on mount

  // Clear handoff context after first message is sent
  const handleDismissContext = useCallback(() => {
    setHandoffContext(null);
  }, []);

  // Create a new chat session
  const createNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'Neuer Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      preview: ''
    };

    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setTokenUsage({ input: 0, output: 0, total: 0 });
    setError(null);
  }, []);

  // Load a chat session
  const loadChatSession = useCallback((sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setError(null);
    }
  }, [chatSessions]);

  // Update current session with new messages
  const updateCurrentSession = useCallback((newMessages: Message[]) => {
    if (!currentSessionId) return;

    setChatSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        const firstUserMsg = newMessages.find(m => m.role === 'user');
        return {
          ...session,
          messages: newMessages,
          updatedAt: new Date(),
          title: firstUserMsg ? firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '') : session.title,
          preview: newMessages.length > 0 ? newMessages[newMessages.length - 1].content.slice(0, 60) : ''
        };
      }
      return session;
    }));
  }, [currentSessionId]);

  // Delete a chat session
  const deleteChatSession = useCallback((sessionId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      createNewChat();
    }
  }, [currentSessionId, createNewChat]);

  // Sync messages to current session
  useEffect(() => {
    if (messages.length > 0) {
      updateCurrentSession(messages);
    }
  }, [messages, updateCurrentSession]);

  // Auto-scroll to bottom when new messages arrive or tool calls change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamingMessage, activeToolCalls, completedToolCalls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessageContent = inputMessage.trim();

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    setStreamingMessage('');
    setError(null);
    setActiveToolCalls([]);
    setCompletedToolCalls([]);
    setCurrentThinking(null);
    setIsRecovering(false);

    // Clear handoff context after first message is sent
    if (handoffContext) {
      setHandoffContext(null);
    }

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': 'default'
        },
        body: JSON.stringify({
          content: userMessageContent,
          // Include agent configuration from Control Panel
          modelId: agentConfig.model,
          temperature: agentConfig.temperature,
          maxTokens: agentConfig.maxTokens,
          activeTools: agentConfig.activeTools,
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = typeof errorData.error === 'object'
          ? errorData.error.message || JSON.stringify(errorData.error)
          : errorData.error || `API Error: ${response.status}`;
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle text chunks
              if (data.chunk) {
                accumulatedResponse += data.chunk;
                setStreamingMessage(accumulatedResponse);
                // Clear thinking when we start getting text
                if (currentThinking) {
                  setCurrentThinking(null);
                }
              }

              // Handle tool call events
              if (data.toolCall) {
                const toolData = data.toolCall;

                if (toolData.status === 'start') {
                  // New tool call starting
                  const newToolCall: ToolCall = {
                    id: `tool-${Date.now()}-${toolData.tool}`,
                    tool: toolData.tool,
                    displayName: toolData.displayName || toolData.tool,
                    status: 'running',
                    args: toolData.args,
                    startedAt: new Date(),
                  };
                  setActiveToolCalls(prev => [...prev, newToolCall]);
                  setCurrentThinking(getThinkingPhase(toolData.tool));
                } else if (toolData.status === 'complete' || toolData.status === 'error') {
                  // Tool call completed
                  setActiveToolCalls(prev => {
                    const updated = prev.filter(t => t.tool !== toolData.tool);
                    const completed = prev.find(t => t.tool === toolData.tool);
                    if (completed) {
                      const finishedTool: ToolCall = {
                        ...completed,
                        status: toolData.status === 'complete' ? 'complete' : 'error',
                        result: toolData.result,
                        completedAt: new Date(),
                      };
                      setCompletedToolCalls(prevCompleted => [...prevCompleted, finishedTool]);
                    }
                    return updated;
                  });

                  // Clear thinking if no more active tools
                  if (activeToolCalls.length <= 1) {
                    setCurrentThinking(null);
                  }
                }
              }

              // Handle recovery attempts
              if (data.recovery) {
                setIsRecovering(true);
                // Auto-clear recovery status after a moment
                setTimeout(() => setIsRecovering(false), 2000);
              }

              if (data.done) {
                const agentMessage: Message = {
                  id: `agent-${Date.now()}`,
                  role: 'agent',
                  content: accumulatedResponse,
                  timestamp: new Date(),
                  tokens: data.metrics?.tokens,
                  costUsd: data.metrics?.costUsd
                };
                setMessages(prev => [...prev, agentMessage]);
                setStreamingMessage('');
                setActiveToolCalls([]);
                setCurrentThinking(null);

                if (data.metrics) {
                  const tokens = data.metrics.tokens || 0;
                  setTokenUsage(prev => ({
                    input: prev.input + Math.floor(tokens * 0.3),
                    output: prev.output + Math.floor(tokens * 0.7),
                    total: prev.total + tokens
                  }));
                }
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Parse error:', parseError);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);

      if (err.name !== 'AbortError') {
        const errorMessage = err.message || 'Fehler beim Senden der Nachricht';
        setError(errorMessage);
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      }
    } finally {
      setIsTyping(false);
      setStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleClearChat = () => {
    if (!confirm('Möchten Sie den Chat wirklich löschen?')) return;

    if (currentSessionId) {
      deleteChatSession(currentSessionId);
    }
  };

  const handleExportChat = () => {
    const chatText = messages
      .map(m => `[${m.timestamp.toLocaleTimeString('de-DE')}] ${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${agentId}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const formatSessionDate = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Gerade eben';
    if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`;
    if (diff < 172800) return 'Gestern';
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  // Error state - Agent not found
  if (!agent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Agent nicht gefunden</h2>
          <button
            onClick={() => router.push('/agents/my-agents')}
            className="text-primary hover:underline"
          >
            Zurück zur Agent-Übersicht
          </button>
        </div>
      </div>
    );
  }

  // Get agent icon
  const AgentIcon = typeof agent.icon === 'string' ? null : agent.icon;

  // Get greeting for empty state - use useState to prevent hydration mismatch
  const [greeting, setGreeting] = useState<string>('');

  useEffect(() => {
    // Only set greeting on client to avoid hydration mismatch
    setGreeting(getRandomGreeting(agentId));
  }, [agentId]);

  // Get sessions without current empty one for display
  const displaySessions = chatSessions.filter(s => s.messages.length > 0 || s.id === currentSessionId);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Content - Full width seamless layout */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Error Banner - Floating at top */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-red-500/10 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 text-red-500 shadow-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-xs hover:underline">
              ×
            </button>
          </div>
        )}

        {/* Context Banner - Shows when chat was initiated from another part of the app */}
        <AnimatePresence>
          {handoffContext && handoffContext.metadata?.showContextPill && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-15"
            >
              <ContextPill
                type={handoffContext.type}
                source={handoffContext.source}
                priority={handoffContext.metadata?.priority}
                onDismiss={handleDismissContext}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className={`flex flex-col flex-1 min-w-0 relative`}>
          {/* Floating Action Bar - Top right corner */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/60 backdrop-blur-sm rounded-lg p-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 text-xs rounded-md transition-all flex items-center gap-1.5 ${
                showHistory
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
              title="Chat-Verlauf"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowControlPanel(!showControlPanel)}
              className={`p-2 text-xs rounded-md transition-all flex items-center gap-1.5 ${
                showControlPanel
                  ? 'text-white'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
              style={showControlPanel ? { backgroundColor: `${agent.color}20`, color: agent.color } : {}}
              title="Control Panel"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportChat}
              className="p-2 text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
              title="Chat exportieren"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClearChat}
              className="p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-md transition-colors"
              title="Chat löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-5"
          >
            {messages.length === 0 && !streamingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                {/* Context-Aware Banner (when handoff context exists) */}
                {handoffContext && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 w-full max-w-lg px-4"
                  >
                    <ContextBanner
                      type={handoffContext.type}
                      source={handoffContext.source}
                      priority={handoffContext.metadata?.priority}
                      message={
                        handoffContext.type === 'budget_warning'
                          ? 'Klicke "Senden", um die Analyse zu starten.'
                          : handoffContext.type === 'anomaly_detected'
                          ? 'Anomalien wurden erkannt. Buddy analysiert deine Finanzdaten.'
                          : 'Kontext aus dem Dashboard wurde übertragen.'
                      }
                      onDismiss={handleDismissContext}
                    />
                  </motion.div>
                )}

                {/* Agent Avatar with personality glow */}
                <div className="relative mb-5">
                  <div
                    className="absolute inset-0 rounded-3xl blur-xl opacity-30"
                    style={{ backgroundColor: agent.color }}
                  />
                  <div
                    className="relative w-20 h-20 rounded-3xl flex items-center justify-center text-3xl shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${agent.color}20 0%, ${agent.color}40 100%)`,
                      border: `2px solid ${agent.color}30`
                    }}
                  >
                    {AgentIcon ? <AgentIcon size={36} style={{ color: agent.color }} /> : agent.emoji || '🤖'}
                  </div>
                  {/* Status indicator */}
                  <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center"
                    style={{ backgroundColor: agent.color }}
                  >
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>

                {/* Agent name with personality */}
                <h2
                  className="text-2xl font-bold mb-1"
                  style={{ color: agent.color }}
                >
                  {agent.name}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">{agent.role}</p>

                {/* Greeting bubble */}
                {greeting && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="max-w-md rounded-2xl px-5 py-4 mb-6"
                    style={{
                      backgroundColor: `${agent.color}10`,
                      border: `1px solid ${agent.color}20`
                    }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: agent.color }}>
                      "{greeting}"
                    </p>
                  </motion.div>
                )}

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {agent.specialties?.slice(0, 3).map((specialty, idx) => (
                    <motion.button
                      key={specialty}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      onClick={() => setInputMessage(`Hilf mir mit ${specialty}`)}
                      className="px-3 py-1.5 text-xs rounded-full transition-all hover:scale-105"
                      style={{
                        backgroundColor: `${agent.color}08`,
                        border: `1px solid ${agent.color}20`,
                        color: agent.color
                      }}
                    >
                      {specialty}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Agent avatar for agent messages */}
                  {message.role === 'agent' && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                      style={{
                        backgroundColor: `${agent.color}15`,
                        border: `1px solid ${agent.color}20`
                      }}
                    >
                      {AgentIcon ? <AgentIcon size={16} style={{ color: agent.color }} /> : <span className="text-xs">{agent.emoji || '🤖'}</span>}
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                        : 'rounded-2xl rounded-bl-md'
                    }`}
                    style={message.role === 'agent' ? {
                      backgroundColor: `${agent.color}08`,
                      border: `1px solid ${agent.color}15`
                    } : {}}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <div className={`flex items-center gap-2 mt-2 text-[11px] ${
                      message.role === 'user'
                        ? 'text-primary-foreground/60'
                        : 'text-muted-foreground/60'
                    }`}>
                      <span>{formatTimestamp(message.timestamp)}</span>
                      {message.tokens && (
                        <span>• {message.tokens} tokens</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming Message */}
            {streamingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                  style={{
                    backgroundColor: `${agent.color}15`,
                    border: `1px solid ${agent.color}20`
                  }}
                >
                  {AgentIcon ? <AgentIcon size={16} style={{ color: agent.color }} /> : <span className="text-xs">{agent.emoji || '🤖'}</span>}
                </div>
                <div
                  className="max-w-[70%] rounded-2xl rounded-bl-md px-4 py-3"
                  style={{
                    backgroundColor: `${agent.color}08`,
                    border: `1px solid ${agent.color}15`
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingMessage}</p>
                  <span
                    className="inline-block ml-1 animate-pulse text-lg"
                    style={{ color: agent.color }}
                  >•</span>
                </div>
              </motion.div>
            )}

            {/* Agent Actions & Thinking Display */}
            {isTyping && (activeToolCalls.length > 0 || completedToolCalls.length > 0 || currentThinking) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                  style={{
                    backgroundColor: `${agent.color}15`,
                    border: `1px solid ${agent.color}20`
                  }}
                >
                  {AgentIcon ? <AgentIcon size={16} style={{ color: agent.color }} /> : <span className="text-xs">{agent.emoji || '🤖'}</span>}
                </div>

                <div className="flex flex-col gap-2 max-w-[70%]">
                  {/* Current Thinking Phase */}
                  {currentThinking && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{
                        backgroundColor: `${agent.color}08`,
                        border: `1px solid ${agent.color}15`
                      }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Brain className="w-4 h-4" style={{ color: agent.color }} />
                      </motion.div>
                      <span className="text-xs font-medium" style={{ color: agent.color }}>
                        {currentThinking.description}
                      </span>
                    </motion.div>
                  )}

                  {/* Active Tool Calls */}
                  <AnimatePresence mode="popLayout">
                    {activeToolCalls.map((toolCall) => {
                      const ToolIcon = getToolIcon(toolCall.tool);
                      return (
                        <motion.div
                          key={toolCall.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{
                            backgroundColor: `${agent.color}10`,
                            border: `1px solid ${agent.color}25`
                          }}
                        >
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          >
                            <ToolIcon className="w-4 h-4" style={{ color: agent.color }} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium" style={{ color: agent.color }}>
                              {toolCall.displayName}
                            </span>
                            {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {Object.entries(toolCall.args).slice(0, 2).map(([key, value]) => (
                                  <span key={key} className="mr-2">
                                    {key}: {String(value).slice(0, 20)}{String(value).length > 20 ? '...' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Loader2 className="w-3 h-3 animate-spin" style={{ color: agent.color }} />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Completed Tool Calls */}
                  <AnimatePresence mode="popLayout">
                    {completedToolCalls.map((toolCall) => {
                      const ToolIcon = getToolIcon(toolCall.tool);
                      const isSuccess = toolCall.status === 'complete';
                      return (
                        <motion.div
                          key={toolCall.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{
                            backgroundColor: isSuccess ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            border: `1px solid ${isSuccess ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}
                        >
                          <ToolIcon className="w-4 h-4" style={{ color: isSuccess ? '#22c55e' : '#ef4444' }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium" style={{ color: isSuccess ? '#22c55e' : '#ef4444' }}>
                              {toolCall.displayName}
                            </span>
                            {toolCall.result?.summary && (
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {toolCall.result.summary.slice(0, 50)}{toolCall.result.summary.length > 50 ? '...' : ''}
                              </div>
                            )}
                            {toolCall.result?.error && (
                              <div className="text-[10px] text-red-400 truncate mt-0.5">
                                {toolCall.result.error.slice(0, 40)}
                              </div>
                            )}
                          </div>
                          {isSuccess ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Recovery Indicator */}
                  {isRecovering && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                      <span className="text-xs text-amber-500">Verbindung wird wiederhergestellt...</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Simple Typing Indicator (when no tool calls) */}
            {isTyping && !streamingMessage && activeToolCalls.length === 0 && completedToolCalls.length === 0 && !currentThinking && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                  style={{
                    backgroundColor: `${agent.color}15`,
                    border: `1px solid ${agent.color}20`
                  }}
                >
                  {AgentIcon ? <AgentIcon size={16} style={{ color: agent.color }} /> : <span className="text-xs">{agent.emoji || '🤖'}</span>}
                </div>
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-3"
                  style={{
                    backgroundColor: `${agent.color}08`,
                    border: `1px solid ${agent.color}15`
                  }}
                >
                  <div className="flex gap-1">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: agent.color }}
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: agent.color }}
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: agent.color }}
                      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                  <span className="text-xs" style={{ color: agent.color }}>{agent.name} denkt nach...</span>
                  <button
                    onClick={handleAbort}
                    className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    Stopp
                  </button>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Integrated with agent personality */}
          <div className="px-6 pb-5 pt-2 shrink-0">
            <div
              className="flex items-end gap-2 rounded-2xl p-2 transition-all"
              style={{
                backgroundColor: `${agent.color}05`,
                border: `1px solid ${agent.color}15`
              }}
            >
              {/* Agent indicator */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5"
                style={{
                  backgroundColor: `${agent.color}15`,
                  border: `1px solid ${agent.color}20`
                }}
                title={agent.name}
              >
                {AgentIcon ? <AgentIcon size={18} style={{ color: agent.color }} /> : <span className="text-sm">{agent.emoji || '🤖'}</span>}
              </div>

              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Frage ${agent.name}...`}
                rows={1}
                disabled={isTyping}
                className="flex-1 resize-none py-2.5 bg-transparent focus:outline-none disabled:opacity-50 placeholder:text-muted-foreground/50 text-sm"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />

              <button
                className="p-2 hover:bg-background/50 rounded-lg transition-colors mb-0.5 text-muted-foreground/60 hover:text-muted-foreground"
                title="Datei anhängen"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="p-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white"
                style={{ backgroundColor: agent.color }}
              >
                {isTyping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chat History Sidebar */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '30%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-muted/10 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Chat-Verlauf
                </h3>
                <button
                  onClick={createNewChat}
                  className="p-2 rounded-lg transition-all text-white text-xs flex items-center gap-1.5"
                  style={{ backgroundColor: agent.color }}
                  title="Neuer Chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Neu
                </button>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
                {displaySessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Keine Chats vorhanden</p>
                  </div>
                ) : (
                  displaySessions.map((session) => (
                    <motion.button
                      key={session.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => loadChatSession(session.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all group ${
                        session.id === currentSessionId
                          ? ''
                          : 'hover:bg-background/50'
                      }`}
                      style={session.id === currentSessionId ? {
                        backgroundColor: `${agent.color}10`,
                        border: `1px solid ${agent.color}30`
                      } : {}}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            session.id === currentSessionId ? '' : 'text-foreground/80'
                          }`} style={session.id === currentSessionId ? { color: agent.color } : {}}>
                            {session.title}
                          </p>
                          {session.preview && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {session.preview}
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatSessionDate(session.updatedAt)}
                            <span className="mx-1">•</span>
                            {session.messages.length} Nachrichten
                          </p>
                        </div>

                        {/* Delete button */}
                        {session.id !== currentSessionId && session.messages.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(session.id);
                            }}
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
                            title="Löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        {session.id === currentSessionId && (
                          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: agent.color }} />
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>

              {/* Stats Footer */}
              {tokenUsage.total > 0 && (
                <div
                  className="p-3 mx-3 mb-3 rounded-xl text-xs"
                  style={{
                    backgroundColor: `${agent.color}08`,
                    border: `1px solid ${agent.color}15`
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tokens gesamt:</span>
                    <span className="font-mono font-medium" style={{ color: agent.color }}>
                      {tokenUsage.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enterprise Control Panel - Right Sidebar */}
        <AnimatePresence>
          {showControlPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden flex-shrink-0"
            >
              <AgentControlPanel
                agentColor={agent.color}
                agentName={agent.name}
                config={agentConfig}
                onConfigChange={(newConfig) => {
                  console.log('[AgentChat] Config changed:', newConfig);
                  setAgentConfig(newConfig);
                }}
                onClearContext={() => {
                  console.log('[AgentChat] Context cleared');
                  // Clear messages for this session
                  setMessages([]);
                  setTokenUsage({ input: 0, output: 0, total: 0 });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
