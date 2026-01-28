'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Shield,
  Code,
  ShoppingCart,
  Users,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Workflow,
  Plug,
  Lock,
  X,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  icon: string;
  color: string;
  description: string;
  longDescription: string;
  features: {
    workflows: number;
    integrations: number;
    permissionLevel: 'Basic' | 'Standard' | 'Advanced';
  };
  useCases: string[];
  previewConfig: {
    systemPrompt: string;
    triggers: string[];
    actions: string[];
  };
}

// Industry Templates Data
const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'maschinenbau-sales',
    name: 'Enterprise Sales Agent',
    industry: 'Maschinenbau',
    icon: '🏢',
    color: '#ec4899',
    description: 'Qualifiziert B2B-Leads und koordiniert mit dem Sales-Team',
    longDescription: 'Dieser Agent ist speziell für den Maschinenbau konzipiert und hilft dabei, eingehende Anfragen zu qualifizieren, technische Spezifikationen zu erfassen und komplexe Sales-Prozesse zu koordinieren.',
    features: {
      workflows: 5,
      integrations: 4,
      permissionLevel: 'Advanced'
    },
    useCases: [
      'Qualifizierung von B2B-Anfragen mit technischen Spezifikationen',
      'Automatische Erstellung von Angeboten basierend auf Produktkatalog',
      'Koordination zwischen Sales, Engineering und Produktion',
      'Follow-up-Automatisierung bei langwierigen Vertriebszyklen'
    ],
    previewConfig: {
      systemPrompt: 'Du bist ein Enterprise Sales Agent für Maschinenbau. Qualifiziere Leads professionell und erfasse technische Anforderungen.',
      triggers: ['Neue Lead-Anfrage', 'Email-Eingang', 'Formular-Submission'],
      actions: ['CRM Update', 'Email Follow-up', 'Slack Notification', 'Quote Generation']
    }
  },
  {
    id: 'versicherung-qualifier',
    name: 'Lead Qualifier',
    industry: 'Versicherung',
    icon: '🛡️',
    color: '#8b5cf6',
    description: 'Qualifiziert eingehende Leads und weist sie zu',
    longDescription: 'Spezialisiert auf die Versicherungsbranche. Erfasst Kundenbedürfnisse, bewertet Risikoprofile und leitet qualifizierte Leads an die passenden Versicherungsberater weiter.',
    features: {
      workflows: 4,
      integrations: 3,
      permissionLevel: 'Standard'
    },
    useCases: [
      'Erfassung von Versicherungsbedarf und Risikoprofil',
      'Automatische Zuweisung zu spezialisierten Beratern',
      'Compliance-konforme Dokumentation aller Kundenkontakte',
      'Multi-Channel Lead-Erfassung (Web, Email, Telefon)'
    ],
    previewConfig: {
      systemPrompt: 'Du bist ein Lead Qualifier für Versicherungen. Erfasse Kundenbedürfnisse und bewerte Leads professionell.',
      triggers: ['Neue Lead-Anfrage', 'Web-Formular', 'Chat-Konversation'],
      actions: ['Lead Scoring', 'Berater-Zuweisung', 'CRM Update', 'Follow-up Email']
    }
  },
  {
    id: 'it-support',
    name: 'Customer Support Bot',
    industry: 'IT-Dienstleister',
    icon: '💬',
    color: '#3b82f6',
    description: 'Beantwortet Kundenanfragen und erstellt Support-Tickets',
    longDescription: 'Optimiert für IT-Support. Beantwortet technische Fragen, erstellt automatisch Support-Tickets und eskaliert komplexe Probleme an das richtige Team.',
    features: {
      workflows: 6,
      integrations: 5,
      permissionLevel: 'Advanced'
    },
    useCases: [
      'First-Level-Support für häufige IT-Probleme',
      'Automatische Ticket-Erstellung in Jira/Zendesk',
      'Wissensdatenbank-Integration für Self-Service',
      'Eskalation komplexer Tickets an Experten'
    ],
    previewConfig: {
      systemPrompt: 'Du bist ein IT-Support Bot. Beantworte technische Fragen und erstelle Support-Tickets.',
      triggers: ['Neue Support-Anfrage', 'Email', 'Chat-Message', 'Ticket-Update'],
      actions: ['Ticket Creation', 'Knowledge Base Search', 'Escalation', 'Status Update', 'Email Response']
    }
  },
  {
    id: 'ecommerce-order',
    name: 'Order Processing Agent',
    industry: 'E-Commerce',
    icon: '🛒',
    color: '#10b981',
    description: 'Automatisiert Bestellabwicklung und Kundenservice',
    longDescription: 'Speziell für E-Commerce entwickelt. Verarbeitet Bestellungen, beantwortet Produktfragen, managed Retouren und koordiniert Versand.',
    features: {
      workflows: 7,
      integrations: 6,
      permissionLevel: 'Advanced'
    },
    useCases: [
      'Automatische Bestellbestätigungen und Tracking-Updates',
      'Produktempfehlungen basierend auf Kundenhistorie',
      'Retouren- und Reklamationsmanagement',
      'Inventory-Synchronisation über mehrere Kanäle'
    ],
    previewConfig: {
      systemPrompt: 'Du bist ein E-Commerce Agent. Verarbeite Bestellungen und unterstütze Kunden professionell.',
      triggers: ['Neue Bestellung', 'Kundenanfrage', 'Retoure', 'Low Stock Alert'],
      actions: ['Order Confirmation', 'Shipping Update', 'Refund Processing', 'Email Notification', 'Inventory Update', 'CRM Sync']
    }
  },
  {
    id: 'recruiting-screening',
    name: 'Candidate Screening Agent',
    industry: 'Recruiting',
    icon: '👔',
    color: '#06b6d4',
    description: 'Screent Bewerbungen und koordiniert Interviews',
    longDescription: 'HR-optimiert für Recruiting-Prozesse. Screent Bewerbungen, führt Erstgespräche, koordiniert Interviewtermine und tracked den Hiring-Prozess.',
    features: {
      workflows: 5,
      integrations: 4,
      permissionLevel: 'Standard'
    },
    useCases: [
      'Automatisches Screening von Bewerbungsunterlagen',
      'KI-gestützte Vorqualifizierung von Kandidaten',
      'Interview-Scheduling mit Kalender-Integration',
      'Automatisierte Kommunikation mit Bewerbern'
    ],
    previewConfig: {
      systemPrompt: 'Du bist ein Recruiting Agent. Screene Bewerbungen und koordiniere Interviews professionell.',
      triggers: ['Neue Bewerbung', 'Email von Bewerber', 'Interview-Anfrage'],
      actions: ['CV Analysis', 'Candidate Scoring', 'Interview Scheduling', 'Email Response', 'ATS Update']
    }
  }
];

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Get unique industries for filter
  const industries = ['all', ...Array.from(new Set(INDUSTRY_TEMPLATES.map(t => t.industry)))];

  // Filter templates
  const filteredTemplates = INDUSTRY_TEMPLATES.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.industry.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesIndustry = selectedIndustry === 'all' || template.industry === selectedIndustry;

    return matchesSearch && matchesIndustry;
  });

  const handleUseTemplate = (template: IndustryTemplate) => {
    setSelectedTemplate(template);
    setAgentName(`${template.name}`);
    setShowModal(true);
  };

  const handleCreateAgent = async () => {
    if (!agentName.trim() || !selectedTemplate) return;

    setIsCreating(true);

    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/agents', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: agentName,
      //     templateId: selectedTemplate.id,
      //     industry: selectedTemplate.industry
      //   })
      // });
      // const agent = await response.json();

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock agent ID
      const mockAgentId = Math.floor(Math.random() * 1000).toString();

      // Redirect to configuration with template pre-filled
      router.push(`/agents/${mockAgentId}/configure?template=${selectedTemplate.id}`);
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Fehler beim Erstellen des Agents. Bitte versuchen Sie es erneut.');
    } finally {
      setIsCreating(false);
    }
  };

  const getIconForIndustry = (industry: string) => {
    const icons: Record<string, JSX.Element> = {
      'Maschinenbau': <Building2 className="w-4 h-4" />,
      'Versicherung': <Shield className="w-4 h-4" />,
      'IT-Dienstleister': <Code className="w-4 h-4" />,
      'E-Commerce': <ShoppingCart className="w-4 h-4" />,
      'Recruiting': <Users className="w-4 h-4" />
    };
    return icons[industry] || <Building2 className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Agent Templates</h1>
        </div>
        <p className="text-muted-foreground">
          Starten Sie schnell mit vorkonfigurierten Agents für verschiedene Branchen
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Templates durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Industry Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Alle Branchen</option>
            {industries.filter(i => i !== 'all').map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="border-2 border-border rounded-xl overflow-hidden bg-card hover:shadow-lg hover:border-primary/50 transition-all"
            >
              {/* Card Header */}
              <div
                className="p-6 border-b border-border"
                style={{ backgroundColor: `${template.color}10` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    {template.icon}
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-background border border-border flex items-center gap-1">
                    {getIconForIndustry(template.industry)}
                    {template.industry}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">{template.name}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
              </div>

              {/* Card Content */}
              <div className="p-6 space-y-4">
                {/* Features */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Workflow className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{template.features.workflows}</div>
                    <div className="text-xs text-muted-foreground">Workflows</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Plug className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{template.features.integrations}</div>
                    <div className="text-xs text-muted-foreground">Integrationen</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <Lock className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold text-xs mt-1">
                      {template.features.permissionLevel}
                    </div>
                    <div className="text-xs text-muted-foreground">Permissions</div>
                  </div>
                </div>

                {/* Use Cases */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Use Cases:</h4>
                  <ul className="space-y-1">
                    {template.useCases.slice(0, 3).map((useCase, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition flex items-center justify-center gap-2 font-medium"
                >
                  Template verwenden
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
            <Search className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Keine Templates gefunden</h2>
          <p className="text-muted-foreground mb-6">
            Versuchen Sie eine andere Suche oder Branche
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedIndustry('all');
            }}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition"
          >
            Filter zurücksetzen
          </button>
        </motion.div>
      )}

      {/* Create Agent Modal */}
      <AnimatePresence>
        {showModal && selectedTemplate && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => !isCreating && setShowModal(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Modal Header */}
                <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: `${selectedTemplate.color}20` }}
                    >
                      {selectedTemplate.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Agent erstellen</h2>
                      <p className="text-sm text-muted-foreground">
                        Basierend auf: {selectedTemplate.name}
                      </p>
                    </div>
                  </div>
                  {!isCreating && (
                    <button
                      onClick={() => setShowModal(false)}
                      className="p-2 hover:bg-muted rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                  {/* Template Info */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <h3 className="font-semibold mb-2">Template Details:</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedTemplate.longDescription}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Workflow className="w-4 h-4 text-primary" />
                        <span>{selectedTemplate.features.workflows} Workflows</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Plug className="w-4 h-4 text-primary" />
                        <span>{selectedTemplate.features.integrations} Integrationen</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" />
                        <span>{selectedTemplate.features.permissionLevel} Permissions</span>
                      </div>
                    </div>
                  </div>

                  {/* Agent Name Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Agent-Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="z.B. Mein Sales Agent"
                      disabled={isCreating}
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Sie können den Namen später jederzeit ändern
                    </p>
                  </div>

                  {/* Included Features Preview */}
                  <div>
                    <h3 className="font-semibold mb-3">Enthaltene Features:</h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="font-medium text-sm mb-1">System Prompt</div>
                        <p className="text-xs text-muted-foreground">
                          {selectedTemplate.previewConfig.systemPrompt}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="font-medium text-sm mb-2">Vorkonfigurierte Triggers:</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.previewConfig.triggers.map((trigger, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                            >
                              {trigger}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30">
                        <div className="font-medium text-sm mb-2">Vorkonfigurierte Actions:</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTemplate.previewConfig.actions.map((action, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowModal(false)}
                      disabled={isCreating}
                      className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleCreateAgent}
                      disabled={!agentName.trim() || isCreating}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                      {isCreating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Erstelle Agent...
                        </>
                      ) : (
                        <>
                          Agent erstellen
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
