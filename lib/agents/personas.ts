import { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Headphones,
  Mail,
  Sparkles,
  Video,
  Film,
  Code2,
  Scale,
  TrendingUp,
  Telescope,
  Shield,
  Workflow,
  Bot,
  Mic,
  Wallet,
  Home,
  Building2
} from 'lucide-react';

export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  description?: string;
  color: string;
  icon: LucideIcon | string; // Support both Lucide icons and emoji strings
  bio: string;
  specialties: string[];
  category?: 'marketing' | 'data' | 'support' | 'operations' | 'creative' | 'technical' | 'motion' | 'Data & Analytics' | 'AI & Automation';
  status?: 'active' | 'beta' | 'coming-soon' | 'draft' | 'archived';
  available?: boolean;
  emoji?: string; // Optional emoji field for custom agents
  // Custom agent metadata (only for custom agents loaded from DB)
  _customAgent?: {
    model: string;
    temperature: number;
    maxTokens: number;
    capabilities?: {
      webBrowsing: boolean;
      codeInterpreter: boolean;
      imageGeneration: boolean;
      knowledgeBase: boolean;
      customActions: boolean;
    };
  };
}

/**
 * SINTRA AI AGENTS
 *
 * Core Agents:
 * - Dexter (Financial Analyst & Data Expert)
 * - Cassie (Customer Support)
 * - Emmie (Email Manager)
 * - Aura (Brand Strategist)
 * - Kai (Code Assistant)
 * - Lex (Legal Advisor)
 * - Finn (Finance Expert)
 * - Nova (Research & Insights)
 *
 * Motion Agents:
 * - Vince (Video Producer)
 * - Milo (Motion Designer)
 *
 * Last update: 2025-12-23
 */
export const agentPersonas: AgentPersona[] = [
  {
    id: 'dexter',
    name: 'Dexter',
    role: 'Financial Analyst & Data Expert',
    description: 'Expert financial analyst powered by OpenAI GPT-4o-mini. Ich berechne ROI, analysiere P&L, prognostiziere Sales und liefere datenbasierte Finanz-Insights.',
    color: '#3B82F6',
    icon: BarChart3,
    bio: 'Expert financial analyst powered by OpenAI GPT-4o-mini. Ich berechne ROI, analysiere P&L, prognostiziere Sales und liefere datenbasierte Finanz-Insights.',
    specialties: ['ROI-Rechner', 'Finanzanalyse', 'Umsatzprognose'],
    category: 'data',
    status: 'active',
    available: true
  },
  {
    id: 'cassie',
    name: 'Cassie',
    role: 'Customer Support',
    color: '#10B981',
    icon: Headphones,
    bio: 'I handle customer queries 24/7, manage tickets, and ensure customer satisfaction.',
    specialties: ['Ticket-Verwaltung', 'FAQ-Erstellung', 'Problemlösung', 'Kundenfeedback'],
    category: 'support',
    status: 'active',
    available: true
  },
  {
    id: 'emmie',
    name: 'Emmie',
    role: 'Email Manager',
    color: '#8B5CF6',
    icon: Mail,
    bio: 'I organize your inbox, draft professional emails, and manage email campaigns.',
    specialties: ['E-Mail-Automatisierung', 'Kampagnen-Management', 'Vorlagen-Erstellung', 'Follow-ups'],
    category: 'operations',
    status: 'active',
    available: true
  },
  {
    id: 'aura',
    name: 'Aura',
    role: 'Brand Strategist',
    color: '#EC4899',
    icon: Sparkles,
    bio: 'I develop brand strategies, positioning, and messaging that resonate with your audience.',
    specialties: ['Markenidentität', 'Positionierung', 'Markenbotschaft', 'Wettbewerbsanalyse'],
    category: 'marketing',
    status: 'active',
    available: true
  },
  {
    id: 'kai',
    name: 'Kai',
    role: 'Code Assistant',
    description: 'Expert code assistant powered by AI. Ich schreibe, debugge und erkläre Code in allen gängigen Programmiersprachen.',
    color: '#10B981',
    icon: Code2,
    bio: 'Expert code assistant powered by AI. Ich schreibe, debugge und erkläre Code in allen gängigen Programmiersprachen.',
    specialties: ['Code-Erstellung', 'Debugging', 'Code-Review', 'Technische Doku'],
    category: 'technical',
    status: 'active',
    available: true
  },
  {
    id: 'lex',
    name: 'Lex',
    role: 'Legal Advisor',
    description: 'KI-gestützter Rechtsberater. Ich helfe bei Vertragsanalysen, Compliance-Fragen und rechtlichen Dokumenten.',
    color: '#64748B',
    icon: Scale,
    bio: 'KI-gestützter Rechtsberater. Ich helfe bei Vertragsanalysen, Compliance-Fragen und rechtlichen Dokumenten.',
    specialties: ['Vertragsanalyse', 'Compliance', 'Rechtsrecherche', 'Dokumentenerstellung'],
    category: 'operations',
    status: 'active',
    available: true
  },
  {
    id: 'finn',
    name: 'Finn',
    role: 'Finance Expert',
    description: 'Finanzexperte für strategische Planung. Ich optimiere Budgets, analysiere Investments und erstelle Finanzprognosen.',
    color: '#059669',
    icon: TrendingUp,
    bio: 'Finanzexperte für strategische Planung. Ich optimiere Budgets, analysiere Investments und erstelle Finanzprognosen.',
    specialties: ['Budgetplanung', 'Investment-Analyse', 'Finanzprognose', 'Kostenoptimierung'],
    category: 'data',
    status: 'active',
    available: true
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'Research & Insights',
    description: 'Research-Spezialist für tiefgreifende Analysen. Ich recherchiere Märkte, Trends und liefere strategische Insights.',
    color: '#06B6D4',
    icon: Telescope,
    bio: 'Research-Spezialist für tiefgreifende Analysen. Ich recherchiere Märkte, Trends und liefere strategische Insights.',
    specialties: ['Marktforschung', 'Trendanalyse', 'Wettbewerbs-Intelligence', 'Strategische Insights'],
    category: 'data',
    status: 'active',
    available: true
  },
  // Motion Category Agents
  {
    id: 'vince',
    name: 'Vince',
    role: 'Video Producer',
    description: 'AI-powered video production expert. Ich erstelle Konzepte, Storyboards und koordiniere Videoproduktionen von der Idee bis zum fertigen Clip.',
    color: '#F97316',
    icon: Video,
    bio: 'AI-powered video production expert. Ich erstelle Konzepte, Storyboards und koordiniere Videoproduktionen von der Idee bis zum fertigen Clip.',
    specialties: ['Video-Konzeption', 'Storyboarding', 'Produktionsplanung', 'Content-Strategie'],
    category: 'motion',
    status: 'active',
    available: true
  },
  {
    id: 'milo',
    name: 'Milo',
    role: 'Motion Designer',
    description: 'Kreatives Motion Design Genie. Ich animiere Logos, erstelle Intros, Transitions und bringe statische Designs zum Leben.',
    color: '#A855F7',
    icon: Film,
    bio: 'Kreatives Motion Design Genie. Ich animiere Logos, erstelle Intros, Transitions und bringe statische Designs zum Leben.',
    specialties: ['Logo-Animation', 'Motion Graphics', 'Übergänge', 'Visuelle Effekte'],
    category: 'motion',
    status: 'active',
    available: true
  },
  // AI & Automation Agents
  {
    id: 'ari',
    name: 'Ari',
    role: 'AI Automation Specialist',
    description: 'Automatisierungs-Experte für intelligente Workflows. Ich designe, implementiere und optimiere KI-gestützte Automatisierungen.',
    color: '#6366F1',
    icon: Workflow,
    bio: 'Automatisierungs-Experte für intelligente Workflows. Ich designe, implementiere und optimiere KI-gestützte Automatisierungen.',
    specialties: ['Smarte Workflows', 'KI-Integration', 'Prozess-Optimierung', 'Automatische Aktionen'],
    category: 'AI & Automation',
    status: 'active',
    available: true
  },
  {
    id: 'vera',
    name: 'Vera',
    role: 'Security & Compliance',
    description: 'Sicherheits- und Compliance-Expertin. Ich prüfe Systeme, identifiziere Risiken und stelle Regelkonformität sicher.',
    color: '#DC2626',
    icon: Shield,
    bio: 'Sicherheits- und Compliance-Expertin. Ich prüfe Systeme, identifiziere Risiken und stelle Regelkonformität sicher.',
    specialties: ['Sicherheits-Audits', 'Risikobewertung', 'Compliance-Prüfung', 'Datenschutz'],
    category: 'operations',
    status: 'active',
    available: true
  },
  {
    id: 'echo',
    name: 'Echo',
    role: 'Voice & Audio Assistant',
    description: 'Audio-Experte für Voice-Inhalte. Ich transkribiere, analysiere und erstelle Audio-Content und Podcasts.',
    color: '#0EA5E9',
    icon: Mic,
    bio: 'Audio-Experte für Voice-Inhalte. Ich transkribiere, analysiere und erstelle Audio-Content und Podcasts.',
    specialties: ['Transkription', 'Audio-Analyse', 'Podcast-Produktion', 'Voice-Content'],
    category: 'creative',
    status: 'active',
    available: true
  },
  {
    id: 'omni',
    name: 'Omni',
    role: 'Multi-Agent Orchestrator',
    description: 'Dein persönlicher Assistent mit einem Team aus Experten. Ich finde den richtigen Spezialisten für jede Aufgabe.',
    color: '#7C3AED',
    icon: Bot,
    bio: 'Dein persönlicher Assistent mit einem Team aus Experten. Ich finde den richtigen Spezialisten für jede Aufgabe.',
    specialties: ['Team-Koordination', 'Komplexe Aufgaben', 'Mehrstufige Workflows', 'Aufgaben-Verteilung'],
    category: 'AI & Automation',
    status: 'active',
    available: true
  },
  // Financial Intelligence Agent
  {
    id: 'buddy',
    name: 'Buddy',
    role: 'Financial Intelligence Assistant',
    description: 'Dein persönlicher Budget-Assistent. Ich überwache deine AI-Kosten, liefere Insights und helfe aktiv bei der Optimierung.',
    color: '#F59E0B',
    icon: Wallet,
    bio: 'Dein persönlicher Budget-Assistent. Ich überwache deine AI-Kosten, liefere Insights und helfe aktiv bei der Optimierung.',
    specialties: ['Budget-Überwachung', 'Kostenoptimierung', 'Nutzungsanalyse', 'Proaktive Warnungen', 'Limit-Verwaltung'],
    category: 'Data & Analytics',
    status: 'active',
    available: true
  },
  // Real Estate Communication Agent
  {
    id: 'tenant-communicator',
    name: 'Tenant Communicator',
    role: 'Mieterkommunikation & Fristenmanagement',
    description: 'Professioneller Kommunikations-Manager fuer Vermieter und Hausverwaltungen. Erstellt rechtssichere Schreiben, berechnet BGB-Fristen und verwaltet Zustellnachweise.',
    color: '#047857',
    icon: Building2,
    bio: 'Professioneller Kommunikations-Manager fuer Vermieter und Hausverwaltungen. Erstellt rechtssichere Schreiben, berechnet BGB-Fristen und verwaltet Zustellnachweise.',
    specialties: ['Mieterschreiben', 'Fristenberechnung', 'Zustellnachweise', 'BGB Mietrecht'],
    category: 'operations',
    status: 'active',
    available: true
  },
  // Real Estate Monitoring Agent
  {
    id: 'property-sentinel',
    name: 'Property Sentinel',
    role: 'Immobilien-Marktüberwachung',
    description: 'Autonomer Überwachungs-Bot für Immobilien-Portale. Scannt 6x täglich nach neuen Inseraten, bewertet Rendite per KI und schiebt Top-Deals in deine Pipeline.',
    color: '#92400E',
    icon: Home,
    bio: 'Autonomer Überwachungs-Bot für Immobilien-Portale. Scannt 6x täglich nach neuen Inseraten, bewertet Rendite per KI und schiebt Top-Deals in deine Pipeline.',
    specialties: ['Portal-Überwachung', 'Rendite-Analyse', 'Deal-Scoring', 'Pipeline-Integration'],
    category: 'Data & Analytics',
    status: 'beta',
    available: true
  }
];

// Helper functions
export function getAllAgents(): AgentPersona[] {
  return agentPersonas;
}

export function getAgentById(id: string): AgentPersona | undefined {
  return agentPersonas.find(agent => agent.id === id);
}

export function getAgentsByCategory(category: AgentPersona['category']): AgentPersona[] {
  return agentPersonas.filter(agent => agent.category === category);
}

export function getActiveAgents(): AgentPersona[] {
  return agentPersonas.filter(agent => agent.status === 'active');
}
