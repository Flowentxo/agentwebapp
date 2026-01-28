'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Bot,
  Shield,
  Eye,
  Pause,
  HelpCircle,
  Sparkles,
  Activity,
  Cpu,
  Network,
  Terminal,
  User,
  Briefcase,
  CircleDot,
  Layers,
  ChevronRight,
  AlertCircle,
  Lightbulb,
  Workflow,
  Plug,
  TestTube,
  Plus,
  TrendingUp,
  Headphones,
  Cog,
  Megaphone,
  Users,
  DollarSign,
  Factory,
  Heart,
  Home,
  Truck,
  Code,
  Building,
  MessageSquare,
  Mail,
  Calendar,
  Database,
  FileText,
  Globe,
  Slack,
  Trello,
  Search,
  Languages,
  Volume2,
  GitBranch
} from 'lucide-react';
import Link from 'next/link';
import { generateAgentFromDescription, type GeneratedAgent } from '@/lib/utils/generateAgentFromDescription';

// ==================== TYPES ====================
type TabType = 'private' | 'business';
type AgentType = 'sales' | 'support' | 'operations' | 'marketing' | 'hr' | 'finance';
type Industry = 'manufacturing' | 'insurance' | 'it' | 'ecommerce' | 'consulting' | 'healthcare' | 'realestate' | 'logistics';
type Tone = 'professional' | 'friendly' | 'technical' | 'casual';
type ResponseStyle = 'quick' | 'detailed';

interface WizardState {
  step: number; // 1-5 (4 steps + preview)
  agentType: AgentType | null;
  industries: Industry[];
  useCases: string[];
  integrations: string[];
  agentName: string;
  tone: Tone;
  languages: string[];
  responseStyle: ResponseStyle;
}

interface UseCase {
  id: string;
  label: string;
  description: string;
  recommended?: boolean;
}

interface Integration {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: 'crm' | 'communication' | 'database' | 'productivity' | 'knowledge';
}

// ==================== CONSTANTS ====================

// Agent Types Configuration
const AGENT_TYPES = {
  sales: {
    icon: <TrendingUp className="w-6 h-6" />,
    label: 'Vertrieb & Akquise',
    description: 'Lead-Qualification, Follow-ups, Meeting-Buchung',
    color: '#10b981'
  },
  support: {
    icon: <Headphones className="w-6 h-6" />,
    label: 'Kundensupport',
    description: 'Anfragen beantworten, Tickets erstellen, Eskalieren',
    color: '#3b82f6'
  },
  operations: {
    icon: <Cog className="w-6 h-6" />,
    label: 'Betrieb & Prozesse',
    description: 'Workflows automatisieren, Daten synchronisieren',
    color: '#8b5cf6'
  },
  marketing: {
    icon: <Megaphone className="w-6 h-6" />,
    label: 'Marketing & Content',
    description: 'Content generieren, Social Media',
    color: '#f59e0b'
  },
  hr: {
    icon: <Users className="w-6 h-6" />,
    label: 'HR & Recruiting',
    description: 'Bewerber screenen, Onboarding',
    color: '#ec4899'
  },
  finance: {
    icon: <DollarSign className="w-6 h-6" />,
    label: 'Finanzen & Controlling',
    description: 'Rechnungen, Mahnungen, Budgetierung',
    color: '#14b8a6'
  }
};

// Industries Configuration
const INDUSTRIES = [
  { id: 'manufacturing', label: 'Maschinenbau', icon: <Factory className="w-4 h-4" /> },
  { id: 'insurance', label: 'Versicherung', icon: <Shield className="w-4 h-4" /> },
  { id: 'it', label: 'IT-Dienstleister', icon: <Code className="w-4 h-4" /> },
  { id: 'ecommerce', label: 'E-Commerce', icon: <Building className="w-4 h-4" /> },
  { id: 'consulting', label: 'Beratung', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'healthcare', label: 'Gesundheitswesen', icon: <Heart className="w-4 h-4" /> },
  { id: 'realestate', label: 'Immobilien', icon: <Home className="w-4 h-4" /> },
  { id: 'logistics', label: 'Logistik', icon: <Truck className="w-4 h-4" /> }
] as const;

// Use Cases by Agent Type
const USE_CASES: Record<AgentType, UseCase[]> = {
  sales: [
    { id: 'lead-qualification', label: 'Lead-Qualifizierung', description: 'Eingehende Anfragen nach Budget, Bedarf, Timeline qualifizieren', recommended: true },
    { id: 'follow-ups', label: 'Automatische Follow-ups', description: 'E-Mail Follow-ups nach 48h, 1 Woche, 2 Wochen versenden' },
    { id: 'meeting-booking', label: 'Meeting-Buchung', description: 'Termine im Kalender finden und Meetings direkt buchen' },
    { id: 'crm-sync', label: 'CRM-Synchronisation', description: 'Alle Aktivitäten automatisch in HubSpot/Salesforce eintragen', recommended: true },
    { id: 'quote-creation', label: 'Angebotserstellung', description: 'Basierend auf Anfrage automatisch Angebote generieren' },
    { id: 'competitor-analysis', label: 'Wettbewerbsanalyse', description: 'Competitor Pricing und Features recherchieren' }
  ],
  support: [
    { id: 'ticket-handling', label: 'Ticket-Bearbeitung', description: 'Kundenanfragen analysieren und beantworten', recommended: true },
    { id: 'escalation', label: 'Eskalationsmanagement', description: 'Komplexe Fälle an richtigen Ansprechpartner weiterleiten' },
    { id: 'faq-automation', label: 'FAQ-Automatisierung', description: 'Häufige Fragen automatisch aus Knowledge Base beantworten', recommended: true },
    { id: 'customer-feedback', label: 'Feedback-Sammlung', description: 'Nach Lösung automatisch Kundenzufriedenheit abfragen' },
    { id: 'multilingual', label: 'Mehrsprachiger Support', description: 'Anfragen in verschiedenen Sprachen beantworten' }
  ],
  operations: [
    { id: 'workflow-automation', label: 'Workflow-Automatisierung', description: 'Wiederkehrende Prozesse automatisch ausführen', recommended: true },
    { id: 'data-sync', label: 'Daten-Synchronisation', description: 'Daten zwischen verschiedenen Systemen abgleichen' },
    { id: 'reporting', label: 'Automatisches Reporting', description: 'Tägliche/wöchentliche Reports generieren und versenden', recommended: true },
    { id: 'quality-check', label: 'Qualitätsprüfung', description: 'Datenqualität und Vollständigkeit prüfen' },
    { id: 'notification', label: 'Benachrichtigungen', description: 'Bei wichtigen Ereignissen Team informieren' }
  ],
  marketing: [
    { id: 'content-generation', label: 'Content-Generierung', description: 'Social Media Posts, Blogartikel, Newsletter erstellen', recommended: true },
    { id: 'seo-optimization', label: 'SEO-Optimierung', description: 'Content auf Keywords und Suchmaschinen optimieren' },
    { id: 'social-scheduling', label: 'Social Media Planung', description: 'Beiträge planen und zum optimalen Zeitpunkt posten' },
    { id: 'campaign-tracking', label: 'Kampagnen-Tracking', description: 'Performance von Kampagnen überwachen und reporten', recommended: true },
    { id: 'competitor-monitoring', label: 'Wettbewerbs-Monitoring', description: 'Aktivitäten der Konkurrenz beobachten' }
  ],
  hr: [
    { id: 'candidate-screening', label: 'Bewerber-Screening', description: 'CVs analysieren und passende Kandidaten identifizieren', recommended: true },
    { id: 'interview-scheduling', label: 'Interview-Koordination', description: 'Termine mit Kandidaten und Interviewern koordinieren' },
    { id: 'onboarding', label: 'Onboarding-Automation', description: 'Neue Mitarbeiter durch Onboarding-Prozess führen', recommended: true },
    { id: 'employee-queries', label: 'Mitarbeiter-Anfragen', description: 'HR-Fragen zu Urlaub, Benefits, Richtlinien beantworten' },
    { id: 'performance-reminders', label: 'Performance-Erinnerungen', description: 'An Mitarbeitergespräche und Reviews erinnern' }
  ],
  finance: [
    { id: 'invoice-processing', label: 'Rechnungsverarbeitung', description: 'Eingangsrechnungen prüfen und kategorisieren', recommended: true },
    { id: 'payment-reminders', label: 'Zahlungserinnerungen', description: 'Automatische Mahnungen bei überfälligen Rechnungen' },
    { id: 'expense-tracking', label: 'Ausgaben-Tracking', description: 'Spesen erfassen und Belege zuordnen', recommended: true },
    { id: 'budget-alerts', label: 'Budget-Warnungen', description: 'Bei Budgetüberschreitungen benachrichtigen' },
    { id: 'financial-reporting', label: 'Finanz-Reporting', description: 'Monatliche Finanzberichte erstellen' }
  ]
};

// Integrations by Category
const INTEGRATIONS: Integration[] = [
  // CRM & Sales
  { id: 'hubspot', label: 'HubSpot', icon: <Database className="w-4 h-4" />, category: 'crm' },
  { id: 'salesforce', label: 'Salesforce', icon: <Database className="w-4 h-4" />, category: 'crm' },
  { id: 'pipedrive', label: 'Pipedrive', icon: <Database className="w-4 h-4" />, category: 'crm' },

  // Communication
  { id: 'gmail', label: 'Gmail', icon: <Mail className="w-4 h-4" />, category: 'communication' },
  { id: 'outlook', label: 'Outlook', icon: <Mail className="w-4 h-4" />, category: 'communication' },
  { id: 'slack', label: 'Slack', icon: <Slack className="w-4 h-4" />, category: 'communication' },
  { id: 'whatsapp', label: 'WhatsApp Business', icon: <MessageSquare className="w-4 h-4" />, category: 'communication' },

  // Databases
  { id: 'postgresql', label: 'PostgreSQL', icon: <Database className="w-4 h-4" />, category: 'database' },
  { id: 'mongodb', label: 'MongoDB', icon: <Database className="w-4 h-4" />, category: 'database' },
  { id: 'airtable', label: 'Airtable', icon: <Database className="w-4 h-4" />, category: 'database' },

  // Productivity
  { id: 'calendar', label: 'Google Calendar', icon: <Calendar className="w-4 h-4" />, category: 'productivity' },
  { id: 'notion', label: 'Notion', icon: <FileText className="w-4 h-4" />, category: 'productivity' },
  { id: 'trello', label: 'Trello', icon: <Trello className="w-4 h-4" />, category: 'productivity' },

  // Knowledge
  { id: 'pdf', label: 'PDF Upload', icon: <FileText className="w-4 h-4" />, category: 'knowledge' },
  { id: 'url', label: 'URL Scraping', icon: <Globe className="w-4 h-4" />, category: 'knowledge' },
  { id: 'text', label: 'Text-Snippets', icon: <FileText className="w-4 h-4" />, category: 'knowledge' }
];

// ==================== COMPONENTS ====================

// System Background Component
function SystemBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Radial Glow - Top */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      {/* Radial Glow - Bottom Right */}
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Scan Line Effect */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        animate={{
          y: [0, typeof window !== 'undefined' ? window.innerHeight : 1000, 0]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
}

// System Header Component
function SystemHeader() {
  return (
    <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Agent System</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Revolution</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-green-500">
              <CircleDot className="w-3 h-3 animate-pulse" />
              <span className="hidden sm:inline">Shell Online</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-500">
              <Activity className="w-3 h-3" />
              <span className="hidden sm:inline">Brain AI verbunden</span>
            </div>
            <div className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-mono">
              v3.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shell Panel Component
function ShellPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card/40 backdrop-blur-sm border border-border/50 rounded-lg ${className}`}>
      {children}
    </div>
  );
}

// Progress Indicator Component
function ProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Schritt {currentStep} von {totalSteps}
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function RevolutionPage() {
  const [wizardState, setWizardState] = useState<WizardState>({
    step: 1,
    agentType: null,
    industries: [],
    useCases: [],
    integrations: [],
    agentName: '',
    tone: 'professional',
    languages: ['Deutsch'],
    responseStyle: 'detailed'
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<GeneratedAgent | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Helper functions
  const updateWizardState = (updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (wizardState.step < 5) {
      updateWizardState({ step: wizardState.step + 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (wizardState.step > 1) {
      updateWizardState({ step: wizardState.step - 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleIndustry = (industry: Industry) => {
    const current = wizardState.industries;
    updateWizardState({
      industries: current.includes(industry)
        ? current.filter(i => i !== industry)
        : [...current, industry]
    });
  };

  const toggleUseCase = (useCaseId: string) => {
    const current = wizardState.useCases;
    updateWizardState({
      useCases: current.includes(useCaseId)
        ? current.filter(id => id !== useCaseId)
        : [...current, useCaseId]
    });
  };

  const toggleIntegration = (integrationId: string) => {
    const current = wizardState.integrations;
    updateWizardState({
      integrations: current.includes(integrationId)
        ? current.filter(id => id !== integrationId)
        : [...current, integrationId]
    });
  };

  // Validation
  const canProceedStep1 = wizardState.agentType !== null && wizardState.industries.length > 0;
  const canProceedStep2 = wizardState.useCases.length > 0;
  const canProceedStep3 = true; // Integrations are optional
  const canProceedStep4 = wizardState.agentName.trim().length >= 3;

  // Smart Defaults: Pre-select recommended use cases
  const handleAgentTypeSelect = (type: AgentType) => {
    updateWizardState({ agentType: type });

    // Pre-select recommended use cases
    const recommendedUseCases = USE_CASES[type]
      .filter(uc => uc.recommended)
      .map(uc => uc.id);
    updateWizardState({ useCases: recommendedUseCases });

    // Pre-select common integrations based on agent type
    const commonIntegrations: Record<AgentType, string[]> = {
      sales: ['hubspot', 'gmail', 'calendar'],
      support: ['slack', 'gmail', 'text'],
      operations: ['notion', 'slack', 'calendar'],
      marketing: ['slack', 'notion', 'url'],
      hr: ['gmail', 'calendar', 'notion'],
      finance: ['gmail', 'notion', 'pdf']
    };
    updateWizardState({ integrations: commonIntegrations[type] || [] });

    // Auto-generate agent name
    const typeLabels: Record<AgentType, string> = {
      sales: 'Sales Agent',
      support: 'Support Agent',
      operations: 'Operations Agent',
      marketing: 'Marketing Agent',
      hr: 'HR Agent',
      finance: 'Finance Agent'
    };
    updateWizardState({ agentName: typeLabels[type] });
  };

  // Handle Agent Creation
  const handleCreateAgent = async () => {
    setIsGenerating(true);

    try {
      if (!wizardState.agentType) {
        throw new Error('Agent type is required');
      }

      // Step 1: Create Agent via API
      const agentResponse = await fetch('/api/revolution/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user', // TODO: Replace with real user ID from auth
        },
        body: JSON.stringify({
          agentType: wizardState.agentType,
          industries: wizardState.industries,
          useCases: wizardState.useCases,
          integrations: wizardState.integrations,
          agentName: wizardState.agentName,
          tone: wizardState.tone,
          languages: wizardState.languages,
          responseStyle: wizardState.responseStyle,
        }),
      });

      if (!agentResponse.ok) {
        const error = await agentResponse.json();
        throw new Error(error.message || 'Failed to create agent');
      }

      const agentData = await agentResponse.json();
      console.log('[REVOLUTION] Agent created:', agentData.agent);

      // Step 2: Create Workflows (optional, in background)
      if (wizardState.useCases.length > 0) {
        fetch('/api/revolution/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'demo-user',
          },
          body: JSON.stringify({
            agentId: agentData.agent.id,
            agentType: wizardState.agentType,
            useCases: wizardState.useCases,
            integrations: wizardState.integrations,
          }),
        })
          .then((res) => res.json())
          .then((workflowData) => {
            console.log('[REVOLUTION] Workflows created:', workflowData.workflows);
          })
          .catch((err) => {
            console.error('[REVOLUTION] Workflow creation failed:', err);
          });
      }

      // Set created agent in state
      setCreatedAgent(agentData.agent);
    } catch (error: any) {
      console.error('Agent creation error:', error);
      alert(`Fehler beim Erstellen des Agenten: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setWizardState({
      step: 1,
      agentType: null,
      industries: [],
      useCases: [],
      integrations: [],
      agentName: '',
      tone: 'professional',
      languages: ['Deutsch'],
      responseStyle: 'detailed'
    });
    setCreatedAgent(null);
  };

  // Success State
  if (createdAgent) {
    return (
      <div className="min-h-screen bg-background relative">
        <SystemBackground />
        <SystemHeader />

        <div className="container mx-auto px-6 py-8 relative z-10">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <ShellPanel className="p-8">
                {/* Success Icon with Animation */}
                <motion.div
                  className="flex justify-center mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </motion.div>

                {/* Success Message */}
                <motion.h1
                  className="text-3xl font-bold text-center mb-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Agent erfolgreich erstellt!
                </motion.h1>
                <motion.p
                  className="text-center text-muted-foreground mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="text-foreground font-medium">"{createdAgent.name}"</span> ist jetzt einsatzbereit
                </motion.p>

                {/* Agent Preview Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <ShellPanel className="p-6 mb-8">
                    <div className="flex items-start gap-4">
                      {/* Agent Icon */}
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center text-3xl flex-shrink-0"
                        style={{ backgroundColor: createdAgent.color }}
                      >
                        {createdAgent.icon}
                      </div>

                      {/* Agent Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{createdAgent.name}</h3>
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs rounded-md border border-purple-500/20 font-medium">
                            Enterprise
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{createdAgent.description}</p>

                        {/* Industry Tag (if present) */}
                        {createdAgent.industry && (
                          <div className="mb-3">
                            <span className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs rounded-md border border-orange-500/20">
                              {createdAgent.industry}
                            </span>
                          </div>
                        )}

                        {/* Capabilities */}
                        {createdAgent.capabilities && (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(createdAgent.capabilities)
                              .filter(([_, enabled]) => enabled)
                              .map(([key, _]) => {
                                const labels: Record<string, string> = {
                                  webBrowsing: 'Web-Suche',
                                  codeInterpreter: 'Code',
                                  imageGeneration: 'Bilder',
                                  knowledgeBase: 'Wissen',
                                  customActions: 'Aktionen'
                                };
                                return (
                                  <span
                                    key={key}
                                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded border border-primary/20 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    {labels[key] || key}
                                  </span>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </ShellPanel>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  className="flex flex-col sm:flex-row gap-3 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <button
                    onClick={() => window.location.href = `/agents/${createdAgent.id}/chat`}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Agent starten</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => window.location.href = `/agents/my-agents`}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Zu meinen Agenten</span>
                  </button>
                </motion.div>

                {/* Simple follow-up */}
                <motion.div
                  className="text-center text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Dein Agent ist live. Du findest ihn jederzeit unter "My Agents" und kannst dort auch Konfiguration oder Wissen nachpflegen.
                </motion.div>
              </ShellPanel>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== WIZARD STEPS ====================

  // Step 1: Agent Type & Industry
  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <ShellPanel className="p-8">
        <ProgressIndicator currentStep={1} totalSteps={4} />

        <h2 className="text-2xl font-bold mb-2">Welchen Agent möchtest du erstellen?</h2>
        <p className="text-muted-foreground mb-8">Wähle den Hauptzweck deines Agents</p>

        {/* Agent Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {(Object.entries(AGENT_TYPES) as [AgentType, typeof AGENT_TYPES[AgentType]][]).map(([key, type]) => (
            <button
              key={key}
              onClick={() => handleAgentTypeSelect(key)}
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                wizardState.agentType === key
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: `${type.color}20`, color: type.color }}
              >
                {type.icon}
              </div>
              <h3 className="font-semibold mb-1">{type.label}</h3>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </button>
          ))}
        </div>

        {/* Industry Selection */}
        {wizardState.agentType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg font-semibold mb-4">In welcher Branche arbeitest du?</h3>
            <p className="text-sm text-muted-foreground mb-4">Du kannst mehrere auswählen</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => toggleIndustry(industry.id as Industry)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                    wizardState.industries.includes(industry.id as Industry)
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {industry.icon}
                  <span className="text-sm font-medium">{industry.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-end gap-3">
          <button
            onClick={nextStep}
            disabled={!canProceedStep1}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span>Weiter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </ShellPanel>
    </motion.div>
  );

  // Step 2: Use Cases
  const renderStep2 = () => {
    const availableUseCases = wizardState.agentType ? USE_CASES[wizardState.agentType] : [];

    return (
      <motion.div
        key="step2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <ShellPanel className="p-8">
          <ProgressIndicator currentStep={2} totalSteps={4} />

          <h2 className="text-2xl font-bold mb-2">Was soll dein Agent konkret tun?</h2>
          <p className="text-muted-foreground mb-8">
            Wähle die Aufgaben aus, die dein Agent übernehmen soll
          </p>

          {/* Use Cases Grid */}
          <div className="space-y-3 mb-8">
            {availableUseCases.map((useCase) => (
              <button
                key={useCase.id}
                onClick={() => toggleUseCase(useCase.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  wizardState.useCases.includes(useCase.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    wizardState.useCases.includes(useCase.id)
                      ? 'border-primary bg-primary'
                      : 'border-border'
                  }`}>
                    {wizardState.useCases.includes(useCase.id) && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{useCase.label}</span>
                      {useCase.recommended && (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs rounded border border-green-500/20">
                          Empfohlen
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{useCase.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-3">
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </button>
            <button
              onClick={nextStep}
              disabled={!canProceedStep2}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <span>Weiter</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </ShellPanel>
      </motion.div>
    );
  };

  // Step 3: Integrations
  const renderStep3 = () => {
    const categories = {
      crm: 'CRM & Sales',
      communication: 'Kommunikation',
      database: 'Datenbanken',
      productivity: 'Produktivität',
      knowledge: 'Wissensdatenbank'
    };

    const integrationsByCategory = Object.entries(categories).map(([key, label]) => ({
      category: key as Integration['category'],
      label,
      integrations: INTEGRATIONS.filter(i => i.category === key)
    }));

    return (
      <motion.div
        key="step3"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <ShellPanel className="p-8">
          <ProgressIndicator currentStep={3} totalSteps={4} />

          <h2 className="text-2xl font-bold mb-2">Welche Tools soll dein Agent nutzen?</h2>
          <p className="text-muted-foreground mb-8">
            Verbinde deinen Agent mit den Tools, die er braucht (optional)
          </p>

          {/* Integrations by Category */}
          <div className="space-y-6 mb-8">
            {integrationsByCategory.map(({ category, label, integrations }) => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  {label}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {integrations.map((integration) => (
                    <button
                      key={integration.id}
                      onClick={() => toggleIntegration(integration.id)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-2 ${
                        wizardState.integrations.includes(integration.id)
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {integration.icon}
                      <span className="text-sm font-medium">{integration.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-3">
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </button>
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <span>Weiter</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </ShellPanel>
      </motion.div>
    );
  };

  // Step 4: Feintuning
  const renderStep4 = () => (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <ShellPanel className="p-8">
        <ProgressIndicator currentStep={4} totalSteps={4} />

        <h2 className="text-2xl font-bold mb-2">Wie soll dein Agent kommunizieren?</h2>
        <p className="text-muted-foreground mb-8">
          Gib deinem Agent eine Persönlichkeit
        </p>

        <div className="space-y-6 mb-8">
          {/* Agent Name */}
          <div>
            <label htmlFor="agent-name" className="block text-sm font-semibold mb-2">
              Agent-Name
            </label>
            <input
              id="agent-name"
              type="text"
              value={wizardState.agentName}
              onChange={(e) => updateWizardState({ agentName: e.target.value })}
              placeholder="z.B. Sales Assistant, Support Bot..."
              className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Tone of Voice */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Tonalität
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['professional', 'friendly', 'technical', 'casual'] as Tone[]).map((tone) => (
                <button
                  key={tone}
                  onClick={() => updateWizardState({ tone })}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    wizardState.tone === tone
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium capitalize">{tone === 'professional' ? 'Professionell' : tone === 'friendly' ? 'Freundlich' : tone === 'technical' ? 'Technisch' : 'Locker'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Sprachen
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Deutsch', 'Englisch', 'Französisch', 'Spanisch', 'Italienisch'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    const current = wizardState.languages;
                    updateWizardState({
                      languages: current.includes(lang)
                        ? current.filter(l => l !== lang)
                        : [...current, lang]
                    });
                  }}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    wizardState.languages.includes(lang)
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-sm font-medium">{lang}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Response Style */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Antwort-Stil
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateWizardState({ responseStyle: 'quick' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  wizardState.responseStyle === 'quick'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <h4 className="font-semibold mb-1">Schnell & knapp</h4>
                <p className="text-xs text-muted-foreground">Kurze, präzise Antworten</p>
              </button>
              <button
                onClick={() => updateWizardState({ responseStyle: 'detailed' })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  wizardState.responseStyle === 'detailed'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <h4 className="font-semibold mb-1">Ausführlich & detailliert</h4>
                <p className="text-xs text-muted-foreground">Umfassende, erklärende Antworten</p>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-3">
          <button
            onClick={prevStep}
            className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>
          <button
            onClick={() => {
              nextStep();
            }}
            disabled={!canProceedStep4}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <span>Vorschau anzeigen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </ShellPanel>
    </motion.div>
  );

  // Step 5: Preview & Create
  const renderStep5 = () => {
    const selectedAgentType = wizardState.agentType ? AGENT_TYPES[wizardState.agentType] : null;
    const selectedIndustries = wizardState.industries.map(i => INDUSTRIES.find(ind => ind.id === i)?.label).filter(Boolean);
    const selectedUseCases = wizardState.useCases.map(id => {
      if (!wizardState.agentType) return null;
      return USE_CASES[wizardState.agentType].find(uc => uc.id === id)?.label;
    }).filter(Boolean);
    const selectedIntegrations = wizardState.integrations.map(id => INTEGRATIONS.find(int => int.id === id)?.label).filter(Boolean);

    return (
      <motion.div
        key="step5"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <ShellPanel className="p-8">
          <h2 className="text-2xl font-bold mb-2">Zusammenfassung</h2>
          <p className="text-muted-foreground mb-8">
            Überprüfe deine Auswahl und erstelle deinen Agent
          </p>

          {/* Summary Card */}
          <div className="space-y-6 mb-8">
            {/* Agent Name & Type */}
            <div className="flex items-start gap-4 p-6 bg-muted/30 rounded-lg">
              {selectedAgentType && (
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${selectedAgentType.color}20`, color: selectedAgentType.color }}
                >
                  {selectedAgentType.icon}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">{wizardState.agentName}</h3>
                <p className="text-sm text-muted-foreground">{selectedAgentType?.label}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branchen */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-primary" />
                  Branchen ({selectedIndustries.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedIndustries.map((industry, idx) => (
                    <span key={idx} className="px-2 py-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs rounded-md border border-orange-500/20">
                      {industry}
                    </span>
                  ))}
                </div>
              </div>

              {/* Use Cases */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  Use Cases ({selectedUseCases.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUseCases.slice(0, 3).map((useCase, idx) => (
                    <span key={idx} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md border border-primary/20">
                      {useCase}
                    </span>
                  ))}
                  {selectedUseCases.length > 3 && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                      +{selectedUseCases.length - 3} mehr
                    </span>
                  )}
                </div>
              </div>

              {/* Integrationen */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Plug className="w-4 h-4 text-primary" />
                  Integrationen ({selectedIntegrations.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedIntegrations.slice(0, 3).map((integration, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded-md border border-blue-500/20">
                      {integration}
                    </span>
                  ))}
                  {selectedIntegrations.length > 3 && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                      +{selectedIntegrations.length - 3} mehr
                    </span>
                  )}
                </div>
              </div>

              {/* Kommunikation */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Kommunikation
                </h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Tonalität: <span className="text-foreground font-medium capitalize">{wizardState.tone === 'professional' ? 'Professionell' : wizardState.tone === 'friendly' ? 'Freundlich' : wizardState.tone === 'technical' ? 'Technisch' : 'Locker'}</span></div>
                  <div>Sprachen: <span className="text-foreground font-medium">{wizardState.languages.join(', ')}</span></div>
                  <div>Stil: <span className="text-foreground font-medium">{wizardState.responseStyle === 'quick' ? 'Schnell & knapp' : 'Ausführlich & detailliert'}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between gap-3">
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </button>
            <button
              onClick={handleCreateAgent}
              disabled={isGenerating}
              className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-primary/20"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Agent wird erstellt…</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Agent erstellen & konfigurieren</span>
                </>
              )}
            </button>
          </div>
        </ShellPanel>
      </motion.div>
    );
  };

  // Main Render
  return (
    <div className="min-h-screen bg-background relative">
      <SystemBackground />
      <SystemHeader />

      <div className="container mx-auto px-6 py-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 text-center"
          >
            <h1 className="text-3xl lg:text-4xl font-bold mb-3">
              Erstelle deinen persönlichen{' '}
              <span className="text-primary">digitalen Helfer</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              In 4 einfachen Schritten zu deinem AI-Agent
            </p>
          </motion.div>

          {/* Template Shortcut Button & Pipeline Studio Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 flex justify-center gap-3 flex-wrap"
          >
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>Oder starte mit einem Template</span>
            </button>
            <Link
              href="/agents/studio"
              className="flex items-center gap-2 px-4 py-2 border border-primary/50 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors text-sm text-primary"
            >
              <GitBranch className="w-4 h-4" />
              <span>Agent Studio öffnen</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </motion.div>

          {/* Wizard Steps */}
          <AnimatePresence mode="wait">
            {wizardState.step === 1 && renderStep1()}
            {wizardState.step === 2 && renderStep2()}
            {wizardState.step === 3 && renderStep3()}
            {wizardState.step === 4 && renderStep4()}
            {wizardState.step === 5 && renderStep5()}
          </AnimatePresence>

          {/* Trust Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12"
          >
            <ShellPanel className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                Sicher & transparent
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Deine Kontrolle</h4>
                    <p className="text-xs text-muted-foreground">
                      Du behältst jederzeit die Kontrolle über deine Daten
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Pause className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Jederzeit änderbar</h4>
                    <p className="text-xs text-muted-foreground">
                      Pausieren oder löschen - wann immer du willst
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-1">Volle Transparenz</h4>
                    <p className="text-xs text-muted-foreground">
                      Sieh jederzeit, was dein Helfer gerade tut
                    </p>
                  </div>
                </div>
              </div>
            </ShellPanel>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
