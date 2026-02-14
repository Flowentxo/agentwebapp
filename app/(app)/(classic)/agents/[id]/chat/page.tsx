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
  X,
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
    'gmail_batch_archive': Archive,
    'gmail_batch_trash': Trash2,
    'gmail_batch_mark_read': Eye,
    'gmail_batch_label': FileText,
    'email_use_template': FileText,
    'email_list_templates': FileText,
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
    'gmail_batch_archive': { phase: 'processing', description: 'Archiviert mehrere E-Mails...' },
    'gmail_batch_trash': { phase: 'processing', description: 'Löscht mehrere E-Mails...' },
    'gmail_batch_mark_read': { phase: 'processing', description: 'Markiert mehrere als gelesen...' },
    'gmail_batch_label': { phase: 'processing', description: 'Ändert Labels...' },
    'email_use_template': { phase: 'writing', description: 'Wendet Vorlage an...' },
    'email_list_templates': { phase: 'searching', description: 'Lädt Vorlagen...' },
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

// =====================================================
// MISSION CONTROL: Per-agent titles & specialty icons
// =====================================================
const agentMissionTitles: Record<string, string> = {
  dexter: 'Ready for Analysis',
  cassie: 'How Can I Help?',
  emmie: 'Inbox Command Center',
  kai: "Let's Build Something",
  lex: 'Legal Intelligence Ready',
  finn: 'Financial Core Online',
  nova: 'Research Mode Active',
  aura: 'Brand Strategy Hub',
  vince: 'Production Studio Ready',
  milo: 'Motion Lab Active',
  ari: 'Automation Engine Online',
  vera: 'Security Scan Ready',
  echo: 'Audio Lab Online',
  omni: 'Orchestrator Online',
  buddy: 'Financial Intel Active',
  default: 'Ready to Assist',
};

const specialtyIcons: Record<string, typeof Search> = {
  'ROI Calculator': Zap,
  'Financial Analysis': Database,
  'Sales Forecasting': ChevronRight,
  'Ticket Management': MessageSquare,
  'FAQ Generation': FileText,
  'Issue Resolution': CheckCircle,
  'Email Draft': Mail,
  'Email Automation': Mail,
  'Campaign Planning': Globe,
  'Campaign Management': Globe,
  'Template Creation': FileText,
  'Follow-Up Sequences': CalendarClock,
  'Code Generation': Zap,
  'Code Review': Eye,
  'Bug Fixing': AlertCircle,
  'Architecture Design': Database,
  'Contract Review': FileText,
  'Compliance Check': CheckCircle,
  'Risk Assessment': AlertCircle,
  'Legal Research': Search,
  'Budget Planning': Database,
  'Investment Analysis': ChevronRight,
  'Tax Strategy': FileText,
  'Market Research': Search,
  'Trend Analysis': Eye,
  'Competitive Intelligence': Brain,
  'Data Synthesis': Database,
  'Brand Strategy': Sparkles,
  'Content Creation': Edit3,
  'Social Media': Globe,
  'Visual Identity': Eye,
  'Video Production': Eye,
  'Storyboarding': FileText,
  'Workflow Design': Zap,
  'Process Automation': Zap,
  'Security Audit': AlertCircle,
  'Threat Detection': Eye,
  'Audio Production': Zap,
  'Task Delegation': MessageSquarePlus,
  'Multi-Agent Coordination': Brain,
  'default': Sparkles,
};

// Specialty descriptions for welcome cards
const specialtyDescriptions: Record<string, string> = {
  'ROI Calculator': 'Calculate return on investment for any business scenario with detailed breakdowns',
  'Financial Analysis': 'Deep-dive into financial statements, margins, and performance metrics',
  'Sales Forecasting': 'Predict future revenue trends based on historical data and market signals',
  'Ticket Management': 'Track, prioritize and resolve customer support tickets efficiently',
  'FAQ Generation': 'Auto-generate comprehensive FAQ documents from your knowledge base',
  'Issue Resolution': 'Diagnose and resolve complex customer issues step by step',
  'Customer Feedback': 'Analyze and act on customer feedback to improve satisfaction',
  'Email Automation': 'Set up automated email sequences and drip campaigns',
  'Campaign Management': 'Plan, execute and monitor multi-channel email campaigns',
  'Template Creation': 'Design reusable, professional email templates for every occasion',
  'Follow-ups': 'Never miss a follow-up with smart scheduling and reminders',
  'Brand Identity': 'Define and refine your brand identity and visual language',
  'Positioning': 'Craft compelling market positioning and value propositions',
  'Messaging': 'Develop consistent, impactful brand messaging frameworks',
  'Competitor Analysis': 'Analyze competitors\' strategies, strengths and weaknesses',
  'Code Generation': 'Generate clean, production-ready code in any programming language',
  'Debugging': 'Find and fix bugs with systematic debugging strategies',
  'Code Review': 'Get thorough code reviews with actionable improvement suggestions',
  'Technical Documentation': 'Create clear, well-structured technical documentation',
  'Contract Analysis': 'Review contracts for risks, obligations and key terms',
  'Compliance': 'Ensure regulatory compliance with up-to-date guidance',
  'Legal Research': 'Research case law, statutes and legal precedents',
  'Document Drafting': 'Draft legal documents with precise, enforceable language',
  'Budget Planning': 'Create detailed budgets with variance tracking and alerts',
  'Investment Analysis': 'Evaluate investment opportunities with risk-adjusted returns',
  'Financial Forecasting': 'Build sophisticated financial models and projections',
  'Cost Optimization': 'Identify cost savings and efficiency improvements',
  'Market Research': 'Research market dynamics, sizing and growth opportunities',
  'Trend Analysis': 'Identify emerging trends and their business implications',
  'Competitive Intelligence': 'Monitor competitive landscape and strategic moves',
  'Strategic Insights': 'Deliver data-driven strategic recommendations',
  'Video Konzeption': 'Develop creative video concepts from brief to final vision',
  'Storyboarding': 'Create visual storyboards for video and motion projects',
  'Production Planning': 'Plan production schedules, resources and deliverables',
  'Content Strategy': 'Design content strategies aligned with business goals',
  'Logo Animation': 'Bring logos to life with professional motion design',
  'Motion Graphics': 'Create eye-catching animated graphics and visual effects',
  'Transitions': 'Design smooth, creative transitions for video projects',
  'Visual Effects': 'Add stunning visual effects to elevate your content',
  'Workflow Automation': 'Build intelligent automated workflows to save time',
  'AI Integration': 'Integrate AI capabilities into your business processes',
  'Process Optimization': 'Streamline and optimize business processes end-to-end',
  'Trigger Design': 'Design event-driven triggers for automated actions',
  'Security Audits': 'Comprehensive security assessments of systems and processes',
  'Risk Assessment': 'Identify, evaluate and mitigate business and technical risks',
  'Compliance Checks': 'Verify adherence to regulatory and policy requirements',
  'Data Privacy': 'Ensure data privacy compliance and best practices',
  'Transcription': 'Convert audio and video content to accurate text transcripts',
  'Audio Analysis': 'Analyze audio content for insights, sentiment and quality',
  'Podcast Production': 'Plan, produce and optimize podcast content',
  'Voice Content': 'Create and manage voice-based content and interactions',
  'Agent Coordination': 'Orchestrate multiple AI agents for complex tasks',
  'Complex Tasks': 'Break down and solve multi-step problems efficiently',
  'Multi-Step Workflows': 'Design and execute complex multi-step workflows',
  'Task Delegation': 'Intelligently delegate tasks to the right specialist agents',
  'Budget Monitoring': 'Track AI spending in real-time across all services',
  'Usage Analytics': 'Analyze usage patterns and optimize resource allocation',
  'Proactive Alerts': 'Get notified before hitting budget limits or anomalies',
  'Limit Management': 'Set and manage spending limits across teams and projects',
};

const getSpecialtyDescription = (specialty: string): string => {
  return specialtyDescriptions[specialty] || `Get expert help with ${specialty.toLowerCase()}`;
};

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

  // Load agent data synchronously
  const agent = getAgentById(agentId);

  // Chat Sessions State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [showModelConfigModal, setShowModelConfigModal] = useState(false);
  const [showToolSuggestions, setShowToolSuggestions] = useState(false);

  // Current Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Agent Action State
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([]);
  const [completedToolCalls, setCompletedToolCalls] = useState<ToolCall[]>([]);
  const [currentThinking, setCurrentThinking] = useState<AgentThinking | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Context-Aware Handoff State
  const [handoffContext, setHandoffContext] = useState<ChatContext | null>(null);
  const consumeContext = useChatStore((state) => state.consumeContext);

  // Agent Configuration State
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);

  // Knowledge files for context panel
  const [knowledgeFiles] = useState([
    { id: '1', name: 'Q3_Financials.pdf', type: 'pdf', size: '2.4 MB', addedAt: '2 hours ago' },
    { id: '2', name: 'Brand_Guidelines.docx', type: 'doc', size: '1.1 MB', addedAt: '1 day ago' },
    { id: '3', name: 'Product_Catalog.csv', type: 'csv', size: '456 KB', addedAt: '3 days ago' },
  ]);
  const fileTypeColors: Record<string, string> = { pdf: '#ef4444', doc: '#3b82f6', txt: '#6b7280', csv: '#22c55e' };

  // Greeting state (client-only to avoid hydration mismatch)
  const [greeting, setGreeting] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat sessions from localStorage
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

  // Save sessions to localStorage
  useEffect(() => {
    if (!agentId || chatSessions.length === 0) return;
    const storageKey = `chat-sessions-${agentId}`;
    localStorage.setItem(storageKey, JSON.stringify(chatSessions));
  }, [chatSessions, agentId]);

  // Context-Aware Handoff
  useEffect(() => {
    const context = consumeContext();
    if (context) {
      setHandoffContext(context);
      if (context.initialPrompt) {
        setInputMessage(context.initialPrompt);
      }
      if (context.metadata?.autoSend && context.initialPrompt) {
        setTimeout(() => { handleSendMessage(); }, 500);
      }
    }
  }, []);

  // Set greeting on client
  useEffect(() => {
    setGreeting(getRandomGreeting(agentId));
  }, [agentId]);

  // Escape key to close panels/modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModelConfigModal) setShowModelConfigModal(false);
        else if (showContextPanel) setShowContextPanel(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showContextPanel, showModelConfigModal]);

  const handleDismissContext = useCallback(() => {
    setHandoffContext(null);
  }, []);

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

  const loadChatSession = useCallback((sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setError(null);
    }
  }, [chatSessions]);

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

  const deleteChatSession = useCallback((sessionId: string) => {
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      createNewChat();
    }
  }, [currentSessionId, createNewChat]);

  useEffect(() => {
    if (messages.length > 0) {
      updateCurrentSession(messages);
    }
  }, [messages, updateCurrentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, streamingMessage, activeToolCalls, completedToolCalls]);

  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  // =====================================================
  // SEND MESSAGE (SSE Streaming — UNCHANGED LOGIC)
  // =====================================================
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessageContent = inputMessage.trim();
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
    setShowToolSuggestions(false);

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

              if (data.chunk) {
                accumulatedResponse += data.chunk;
                setStreamingMessage(accumulatedResponse);
                if (currentThinking) {
                  setCurrentThinking(null);
                }
              }

              if (data.toolCall) {
                const toolData = data.toolCall;
                if (toolData.status === 'start') {
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
                  if (activeToolCalls.length <= 1) {
                    setCurrentThinking(null);
                  }
                }
              }

              if (data.recovery) {
                setIsRecovering(true);
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

  const AgentIcon = typeof agent.icon === 'string' ? null : agent.icon;
  const missionTitle = agentMissionTitles[agentId] || agentMissionTitles.default;
  const displaySessions = chatSessions.filter(s => s.messages.length > 0 || s.id === currentSessionId);

  return (
    <div className="h-full flex overflow-hidden relative" style={{ background: '#111114' }}>
      {/* ============================================= */}
      {/* AMBIENT AGENT-COLOR GRADIENT                  */}
      {/* ============================================= */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 1100px 900px at 85% 95%, ${agent.color}26, transparent 65%),
            radial-gradient(ellipse 600px 400px at 80% 90%, ${agent.color}18, transparent 50%)
          `,
          filter: 'blur(1px)',
        }}
      />

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* Error Banner */}
        {error && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-red-500/10 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 text-red-500 shadow-lg border border-red-500/20">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 text-xs hover:underline">×</button>
          </div>
        )}

        {/* Context Banner */}
        <AnimatePresence>
          {handoffContext && handoffContext.metadata?.showContextPill && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-14 left-1/2 -translate-x-1/2 z-15"
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
        <div className="flex flex-col flex-1 min-w-0 relative">

          {/* ============================================= */}
          {/* MINIMALIST HEADER                             */}
          {/* ============================================= */}
          <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: agent.color }}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="text-sm font-medium text-white/90">{agent.name}</span>
              <span className="text-[11px] text-white/25 font-light">{agent.role}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setShowContextPanel(!showContextPanel)}
                className={`p-2 rounded-lg transition-all ${
                  showContextPanel ? 'text-white/80' : 'text-white/25 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
                style={showContextPanel ? { backgroundColor: `${agent.color}15`, color: agent.color } : {}}
                title="Context Panel"
              >
                <Brain className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2 rounded-lg transition-all ${
                  showHistory ? 'text-white/80' : 'text-white/25 hover:text-white/60 hover:bg-white/[0.04]'
                }`}
                style={showHistory ? { backgroundColor: `${agent.color}15`, color: agent.color } : {}}
                title="Chat-Verlauf"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExportChat}
                className="p-2 text-white/25 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all"
                title="Exportieren"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClearChat}
                className="p-2 text-white/25 hover:text-red-400 hover:bg-red-500/[0.08] rounded-lg transition-all"
                title="Löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ============================================= */}
          {/* MESSAGES AREA                                 */}
          {/* ============================================= */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-5"
          >
            {/* ============================================= */}
            {/* MISSION CONTROL GRID (Welcome Screen)         */}
            {/* ============================================= */}
            {messages.length === 0 && !streamingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center justify-center h-full text-center px-4"
              >
                {/* Context-Aware Banner */}
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

                {/* Glowing Agent Icon */}
                <div className="relative mb-8">
                  <div
                    className="absolute -inset-5 rounded-full blur-2xl opacity-20"
                    style={{ backgroundColor: agent.color }}
                  />
                  <motion.div
                    animate={{
                      boxShadow: [
                        `0 0 30px ${agent.color}15, 0 0 60px ${agent.color}08`,
                        `0 0 50px ${agent.color}25, 0 0 80px ${agent.color}12`,
                        `0 0 30px ${agent.color}15, 0 0 60px ${agent.color}08`,
                      ],
                    }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${agent.color}12 0%, ${agent.color}25 100%)`,
                      border: `1px solid ${agent.color}20`,
                    }}
                  >
                    {AgentIcon ? (
                      <AgentIcon size={44} style={{ color: agent.color }} />
                    ) : (
                      <span className="text-4xl">{agent.emoji || '🤖'}</span>
                    )}
                  </motion.div>
                  <div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center"
                    style={{ backgroundColor: agent.color, borderColor: '#111114' }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Mission Title */}
                <h1 className="text-2xl font-bold text-white/90 mb-1">{missionTitle}</h1>
                <p className="text-sm text-white/30 mb-8 max-w-md leading-relaxed">{agent.bio}</p>

                {/* Capabilities Cards (3 large cards) */}
                <div className="grid grid-cols-3 gap-4 max-w-2xl w-full">
                  {agent.specialties?.slice(0, 3).map((specialty, idx) => {
                    const SpecIcon = specialtyIcons[specialty] || specialtyIcons.default;
                    return (
                      <motion.button
                        key={specialty}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => setInputMessage(`Hilf mir mit ${specialty}`)}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex flex-col items-start gap-4 p-6 rounded-2xl text-left group/cap transition-all cursor-pointer relative overflow-hidden"
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = `${agent.color}35`;
                          e.currentTarget.style.boxShadow = `0 0 40px ${agent.color}12, inset 0 1px 0 ${agent.color}15`;
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
                          style={{ background: `linear-gradient(90deg, transparent, ${agent.color}60, transparent)` }}
                        />
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            backgroundColor: `${agent.color}10`,
                            border: `1px solid ${agent.color}18`,
                          }}
                        >
                          <SpecIcon className="w-6 h-6" style={{ color: agent.color }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white/80 group-hover/cap:text-white transition-colors mb-1.5">
                            {specialty}
                          </div>
                          <div className="text-[11px] text-white/25 group-hover/cap:text-white/40 transition-colors leading-relaxed">
                            {getSpecialtyDescription(specialty)}
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
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'agent' && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                      style={{
                        backgroundColor: `${agent.color}12`,
                        border: `1px solid ${agent.color}18`
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
                      backgroundColor: `${agent.color}06`,
                      border: `1px solid ${agent.color}12`
                    } : {}}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <div className={`flex items-center gap-2 mt-2 text-[11px] ${
                      message.role === 'user' ? 'text-primary-foreground/60' : 'text-white/20'
                    }`}>
                      <span>{formatTimestamp(message.timestamp)}</span>
                      {message.tokens && <span>• {message.tokens} tokens</span>}
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
                    backgroundColor: `${agent.color}12`,
                    border: `1px solid ${agent.color}18`
                  }}
                >
                  {AgentIcon ? <AgentIcon size={16} style={{ color: agent.color }} /> : <span className="text-xs">{agent.emoji || '🤖'}</span>}
                </div>
                <div
                  className="max-w-[70%] rounded-2xl rounded-bl-md px-4 py-3"
                  style={{
                    backgroundColor: `${agent.color}06`,
                    border: `1px solid ${agent.color}12`
                  }}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingMessage}</p>
                  <span className="inline-block ml-1 animate-pulse text-lg" style={{ color: agent.color }}>•</span>
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
                    backgroundColor: `${agent.color}12`,
                    border: `1px solid ${agent.color}18`
                  }}
                >
                  {AgentIcon ? <AgentIcon size={16} style={{ color: agent.color }} /> : <span className="text-xs">{agent.emoji || '🤖'}</span>}
                </div>

                <div className="flex flex-col gap-2 max-w-[70%]">
                  {currentThinking && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{
                        backgroundColor: `${agent.color}06`,
                        border: `1px solid ${agent.color}12`
                      }}
                    >
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Brain className="w-4 h-4" style={{ color: agent.color }} />
                      </motion.div>
                      <span className="text-xs font-medium" style={{ color: agent.color }}>
                        {currentThinking.description}
                      </span>
                    </motion.div>
                  )}

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
                            backgroundColor: `${agent.color}08`,
                            border: `1px solid ${agent.color}18`
                          }}
                        >
                          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                            <ToolIcon className="w-4 h-4" style={{ color: agent.color }} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium" style={{ color: agent.color }}>
                              {toolCall.displayName}
                            </span>
                            {toolCall.args && Object.keys(toolCall.args).length > 0 && (
                              <div className="text-[10px] text-white/20 truncate mt-0.5">
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
                            backgroundColor: isSuccess ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                            border: `1px solid ${isSuccess ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
                          }}
                        >
                          <ToolIcon className="w-4 h-4" style={{ color: isSuccess ? '#22c55e' : '#ef4444' }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium" style={{ color: isSuccess ? '#22c55e' : '#ef4444' }}>
                              {toolCall.displayName}
                            </span>
                            {toolCall.result?.summary && (
                              <div className="text-[10px] text-white/20 truncate mt-0.5">
                                {toolCall.result.summary.slice(0, 50)}{toolCall.result.summary.length > 50 ? '...' : ''}
                              </div>
                            )}
                            {toolCall.result?.error && (
                              <div className="text-[10px] text-red-400/60 truncate mt-0.5">
                                {toolCall.result.error.slice(0, 40)}
                              </div>
                            )}
                          </div>
                          {isSuccess ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500/70" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-500/70" />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {isRecovering && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.06] border border-amber-500/15"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-500/70 animate-spin" />
                      <span className="text-xs text-amber-500/70">Verbindung wird wiederhergestellt...</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Simple Typing Indicator */}
            {isTyping && !streamingMessage && activeToolCalls.length === 0 && completedToolCalls.length === 0 && !currentThinking && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1"
                  style={{
                    backgroundColor: `${agent.color}12`,
                    border: `1px solid ${agent.color}18`
                  }}
                >
                  {AgentIcon ? <AgentIcon size={16} style={{ color: agent.color }} /> : <span className="text-xs">{agent.emoji || '🤖'}</span>}
                </div>
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-3"
                  style={{
                    backgroundColor: `${agent.color}06`,
                    border: `1px solid ${agent.color}12`
                  }}
                >
                  <div className="flex gap-1">
                    {[0, 0.15, 0.3].map((delay) => (
                      <motion.div
                        key={delay}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: agent.color }}
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white/30">{agent.name} denkt nach...</span>
                  <button
                    onClick={handleAbort}
                    className="text-xs text-white/20 hover:text-red-400 transition-colors"
                  >
                    Stopp
                  </button>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ============================================= */}
          {/* FLOATING INPUT BAR                            */}
          {/* ============================================= */}
          <div className="px-6 pb-6 pt-3 shrink-0">
            {/* Tool Suggestions (above input) */}
            <AnimatePresence>
              {showToolSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mx-auto max-w-3xl mb-2 p-3 rounded-xl flex flex-wrap gap-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {agent.specialties?.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInputMessage(`Hilf mir mit ${s}`); setShowToolSuggestions(false); }}
                      className="px-3 py-1.5 text-[11px] rounded-full transition-all hover:scale-105"
                      style={{
                        backgroundColor: `${agent.color}08`,
                        border: `1px solid ${agent.color}18`,
                        color: agent.color,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Glass Input */}
            <div
              className="flex items-end gap-2 rounded-[28px] p-3 px-4 transition-all mx-auto max-w-3xl"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(60px)',
                boxShadow: '0 -12px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              }}
            >
              {/* Agent indicator */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mb-0.5"
                style={{
                  backgroundColor: `${agent.color}12`,
                  border: `1px solid ${agent.color}18`
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
                className="flex-1 resize-none py-2.5 bg-transparent focus:outline-none disabled:opacity-50 placeholder:text-white/15 text-sm text-white/90"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />

              {/* Magic Button ✨ */}
              <button
                onClick={() => setShowToolSuggestions(!showToolSuggestions)}
                className="p-2 rounded-lg transition-all mb-0.5"
                style={{
                  color: showToolSuggestions ? agent.color : 'rgba(255,255,255,0.25)',
                  backgroundColor: showToolSuggestions ? `${agent.color}12` : 'transparent',
                }}
                title="Tool-Vorschläge"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              <button
                className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors mb-0.5 text-white/20 hover:text-white/50"
                title="Datei anhängen"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="p-2.5 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed text-white"
                style={{
                  backgroundColor: agent.color,
                  boxShadow: (!inputMessage.trim() || isTyping)
                    ? 'none'
                    : `0 0 20px ${agent.color}40, 0 0 40px ${agent.color}20`,
                }}
              >
                {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================= */}
        {/* CHAT HISTORY SIDEBAR (hidden by default)      */}
        {/* ============================================= */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '30%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="bg-white/[0.015] overflow-hidden flex flex-col border-l border-white/[0.04]"
            >
              <div className="p-4 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-medium flex items-center gap-2 text-white/60">
                  <Clock className="w-4 h-4 text-white/25" />
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

              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
                {displaySessions.length === 0 ? (
                  <div className="text-center py-8 text-white/20">
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
                        session.id === currentSessionId ? '' : 'hover:bg-white/[0.03]'
                      }`}
                      style={session.id === currentSessionId ? {
                        backgroundColor: `${agent.color}08`,
                        border: `1px solid ${agent.color}20`
                      } : {}}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            session.id === currentSessionId ? '' : 'text-white/60'
                          }`} style={session.id === currentSessionId ? { color: agent.color } : {}}>
                            {session.title}
                          </p>
                          {session.preview && (
                            <p className="text-xs text-white/20 truncate mt-0.5">{session.preview}</p>
                          )}
                          <p className="text-[10px] text-white/15 mt-1.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatSessionDate(session.updatedAt)}
                            <span className="mx-1">•</span>
                            {session.messages.length} Nachrichten
                          </p>
                        </div>

                        {session.id !== currentSessionId && session.messages.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteChatSession(session.id); }}
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
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

              {tokenUsage.total > 0 && (
                <div
                  className="p-3 mx-3 mb-3 rounded-xl text-xs"
                  style={{
                    backgroundColor: `${agent.color}06`,
                    border: `1px solid ${agent.color}12`
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white/25">Tokens gesamt:</span>
                    <span className="font-mono font-medium" style={{ color: agent.color }}>
                      {tokenUsage.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================= */}
        {/* CONTEXT PANEL (inline sidebar)                */}
        {/* ============================================= */}
        <AnimatePresence>
          {showContextPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '320px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden flex flex-col border-l border-white/[0.04] shrink-0"
              style={{ background: 'rgba(17, 17, 20, 0.95)' }}
            >
              {/* Panel Header */}
              <div className="p-4 flex items-center justify-between shrink-0 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4" style={{ color: agent.color }} />
                  <h3 className="text-sm font-medium text-white/70">Active Context</h3>
                </div>
                <button
                  onClick={() => setShowModelConfigModal(true)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-all"
                  title="Model Configuration"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Knowledge Files */}
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    Knowledge Files
                  </p>
                  <div className="space-y-2">
                    {knowledgeFiles.map(file => {
                      const typeColor = fileTypeColors[file.type] || '#6b7280';
                      return (
                        <div
                          key={file.id}
                          className="p-3 rounded-xl group transition-all hover:scale-[1.01]"
                          style={{
                            background: 'rgba(255,255,255,0.025)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase shrink-0"
                              style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                            >
                              {file.type}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white/70 truncate">{file.name}</p>
                              <p className="text-[10px] text-white/20">{file.size} &middot; {file.addedAt}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Capabilities */}
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    Active Capabilities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {agentConfig.activeTools.map(toolId => (
                      <span
                        key={toolId}
                        className="px-2.5 py-1 text-[11px] rounded-full"
                        style={{
                          backgroundColor: `${agent.color}10`,
                          border: `1px solid ${agent.color}20`,
                          color: agent.color,
                        }}
                      >
                        {toolId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Memory Stats */}
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Database className="w-3 h-3" />
                    Memory
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-[9px] text-white/20">Context Window</p>
                      <p className="text-xs font-mono text-white/50">128K tokens</p>
                    </div>
                    <div className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-[9px] text-white/20">Used</p>
                      <p className="text-xs font-mono" style={{ color: agent.color }}>
                        {tokenUsage.total > 0 ? `${(tokenUsage.total / 1000).toFixed(1)}K` : '0'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clear Context */}
                <button
                  onClick={() => {
                    setMessages([]);
                    setTokenUsage({ input: 0, output: 0, total: 0 });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-xs text-white/30 hover:text-white/60 transition-colors flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <RefreshCw className="w-3 h-3" />
                  Clear Context
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================= */}
      {/* MODEL CONFIG MODAL                            */}
      {/* ============================================= */}
      <AnimatePresence>
        {showModelConfigModal && (
          <div className="fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModelConfigModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl"
              style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <span className="text-sm font-medium text-white/70">Model Configuration</span>
                <button
                  onClick={() => setShowModelConfigModal(false)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AgentControlPanel
                agentColor={agent.color}
                agentName={agent.name}
                config={agentConfig}
                onConfigChange={(newConfig) => {
                  console.log('[AgentChat] Config changed:', newConfig);
                  setAgentConfig(newConfig);
                }}
                onClearContext={() => {
                  setMessages([]);
                  setTokenUsage({ input: 0, output: 0, total: 0 });
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
