'use client';

/**
 * TEMPLATE GALLERY - Agent Revolution
 *
 * 8 Pre-built agent templates for quick creation
 * Categories: Vertrieb, Support, Betrieb, Marketing, HR, Finanzen
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Star,
  Zap,
  Users,
  Calendar,
  Headphones,
  PenTool,
  UserSearch,
  FileText,
  BookOpen,
  Database,
  Clock,
  TrendingUp,
  Shield,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useKeyboardNavigation } from './AgentAnimations';

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'vertrieb' | 'support' | 'betrieb' | 'marketing' | 'hr' | 'finanzen';
  complexity: 'simple' | 'medium' | 'advanced';
  estimatedSetup: string;
  tools: string[];
  icon: React.ElementType;
  color: string;
  isPopular?: boolean;
  isNew?: boolean;
  previewPrompt: string;
}

// 8 Pre-defined Templates
export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'sales-qualifier',
    name: 'Sales Qualifier Pro',
    description: 'Qualifiziert Leads automatisch anhand von BANT-Kriterien und priorisiert High-Value Opportunities.',
    category: 'vertrieb',
    complexity: 'medium',
    estimatedSetup: '5 min',
    tools: ['CRM Integration', 'Email', 'Lead Scoring', 'Calendar Sync'],
    icon: TrendingUp,
    color: '#10B981',
    isPopular: true,
    previewPrompt: 'Create a sales qualification agent that uses BANT criteria to score and prioritize leads, integrates with CRM to track interactions, and sends follow-up emails automatically.'
  },
  {
    id: 'meeting-scheduler',
    name: 'Meeting Scheduler',
    description: 'Koordiniert Termine intelligent zwischen mehreren Teilnehmern unter Berücksichtigung von Zeitzonen.',
    category: 'betrieb',
    complexity: 'simple',
    estimatedSetup: '3 min',
    tools: ['Calendar', 'Email', 'Timezone API'],
    icon: Calendar,
    color: '#6366F1',
    previewPrompt: 'Create an intelligent meeting scheduling agent that coordinates availability across multiple participants, handles timezone conversions, and sends calendar invites automatically.'
  },
  {
    id: 'support-hero',
    name: 'Customer Support Hero',
    description: 'Beantwortet häufige Kundenanfragen, erstellt Tickets und eskaliert bei Bedarf zum menschlichen Support.',
    category: 'support',
    complexity: 'medium',
    estimatedSetup: '7 min',
    tools: ['Helpdesk', 'Knowledge Base', 'Sentiment Analysis', 'Ticket System'],
    icon: Headphones,
    color: '#EC4899',
    isPopular: true,
    previewPrompt: 'Create a customer support agent that handles common inquiries using knowledge base articles, creates support tickets, detects sentiment, and escalates complex issues to human agents.'
  },
  {
    id: 'content-creator',
    name: 'Content Creator Assistant',
    description: 'Generiert Social Media Posts, Blog-Outlines und Marketing-Texte basierend auf Brand Guidelines.',
    category: 'marketing',
    complexity: 'medium',
    estimatedSetup: '5 min',
    tools: ['AI Writer', 'Image Generator', 'Brand Guidelines', 'Social Scheduler'],
    icon: PenTool,
    color: '#F59E0B',
    isNew: true,
    previewPrompt: 'Create a content creation agent that generates social media posts, blog outlines, and marketing copy following brand guidelines, with image suggestions and scheduling capabilities.'
  },
  {
    id: 'recruiter-bot',
    name: 'Recruiter Bot',
    description: 'Screent Bewerber-CVs, führt erste Interviews und plant Gespräche mit Hiring Managern.',
    category: 'hr',
    complexity: 'advanced',
    estimatedSetup: '10 min',
    tools: ['CV Parser', 'ATS Integration', 'Video Interview', 'Calendar'],
    icon: UserSearch,
    color: '#8B5CF6',
    previewPrompt: 'Create a recruitment agent that screens resumes against job requirements, conducts initial screening interviews, scores candidates, and schedules interviews with hiring managers.'
  },
  {
    id: 'invoice-manager',
    name: 'Invoice Manager',
    description: 'Verarbeitet eingehende Rechnungen, extrahiert Daten und initiiert Zahlungsfreigaben.',
    category: 'finanzen',
    complexity: 'advanced',
    estimatedSetup: '8 min',
    tools: ['OCR', 'ERP Integration', 'Approval Workflow', 'Document Storage'],
    icon: FileText,
    color: '#14B8A6',
    previewPrompt: 'Create an invoice processing agent that extracts data from incoming invoices using OCR, validates against purchase orders, routes for approval, and integrates with the ERP system.'
  },
  {
    id: 'onboarding-buddy',
    name: 'Onboarding Buddy',
    description: 'Begleitet neue Mitarbeiter durch den Onboarding-Prozess mit personalisierten Checklisten.',
    category: 'hr',
    complexity: 'simple',
    estimatedSetup: '4 min',
    tools: ['Task Management', 'Document Library', 'Chat', 'Progress Tracker'],
    icon: BookOpen,
    color: '#3B82F6',
    isNew: true,
    previewPrompt: 'Create an employee onboarding agent that guides new hires through personalized checklists, provides access to resources, answers common questions, and tracks completion progress.'
  },
  {
    id: 'data-sync',
    name: 'Data Sync Automator',
    description: 'Synchronisiert Daten zwischen verschiedenen Systemen und meldet Inkonsistenzen proaktiv.',
    category: 'betrieb',
    complexity: 'advanced',
    estimatedSetup: '12 min',
    tools: ['API Connectors', 'Data Validation', 'Error Logging', 'Webhook Handler'],
    icon: Database,
    color: '#EF4444',
    previewPrompt: 'Create a data synchronization agent that keeps multiple systems in sync, validates data consistency, logs errors, handles webhooks for real-time updates, and sends alerts for anomalies.'
  }
];

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: AgentTemplate) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Alle', icon: Sparkles },
  { id: 'vertrieb', label: 'Vertrieb', icon: TrendingUp },
  { id: 'support', label: 'Support', icon: Headphones },
  { id: 'betrieb', label: 'Betrieb', icon: Database },
  { id: 'marketing', label: 'Marketing', icon: PenTool },
  { id: 'hr', label: 'HR', icon: Users },
  { id: 'finanzen', label: 'Finanzen', icon: FileText }
];

const COMPLEXITY_LABELS = {
  simple: { label: 'Einfach', color: '#10B981' },
  medium: { label: 'Mittel', color: '#F59E0B' },
  advanced: { label: 'Fortgeschritten', color: '#EF4444' }
};

export function TemplateGallery({ isOpen, onClose, onSelectTemplate }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter templates
  const filteredTemplates = AGENT_TEMPLATES.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tools.some(tool => tool.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Handle template selection
  const handleSelect = useCallback((template: AgentTemplate) => {
    onSelectTemplate(template);
    onClose();
  }, [onSelectTemplate, onClose]);

  // Keyboard navigation for template grid
  const { focusedIndex, getItemProps } = useKeyboardNavigation({
    items: filteredTemplates.map(t => t.name),
    onSelect: (index) => {
      if (filteredTemplates[index]) {
        handleSelect(filteredTemplates[index]);
      }
    },
    onEscape: onClose,
    orientation: 'grid',
    gridColumns: 2
  });

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Update hovered template based on keyboard focus
  useEffect(() => {
    if (focusedIndex >= 0 && filteredTemplates[focusedIndex]) {
      setHoveredTemplate(filteredTemplates[focusedIndex].id);
    }
  }, [focusedIndex, filteredTemplates]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-5xl max-h-[85vh] mx-4 overflow-hidden rounded-2xl glass border border-white/10"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(17, 24, 39, 0.95) 100%)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/10" style={{ background: 'rgba(17, 24, 39, 0.95)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Template-Galerie
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Wähle eine Vorlage für einen schnellen Start
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-card/10 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Templates durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-card/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-colors"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {CATEGORIES.map(category => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-card/5 text-muted-foreground border border-transparent hover:bg-card/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Template Grid */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(85vh - 160px)' }}>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Keine Templates gefunden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Versuche andere Suchbegriffe oder Kategorien
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="listbox" aria-label="Template Auswahl">
              {filteredTemplates.map((template, index) => {
                const Icon = template.icon;
                const complexity = COMPLEXITY_LABELS[template.complexity];
                const isHovered = hoveredTemplate === template.id;
                const isFocused = focusedIndex === index;
                const itemProps = getItemProps(index);

                return (
                  <button
                    key={template.id}
                    {...itemProps}
                    onClick={() => handleSelect(template)}
                    onMouseEnter={() => setHoveredTemplate(template.id)}
                    onMouseLeave={() => setHoveredTemplate(null)}
                    className={`relative p-5 rounded-xl text-left transition-all duration-300 group outline-none ${
                      isHovered || isFocused ? 'scale-[1.02]' : ''
                    } ${isFocused ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''}`}
                    style={{
                      background: isHovered || isFocused
                        ? `linear-gradient(135deg, ${template.color}15 0%, ${template.color}05 100%)`
                        : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isHovered || isFocused ? `${template.color}40` : 'rgba(255, 255, 255, 0.1)'}`,
                      boxShadow: isHovered || isFocused ? `0 10px 40px ${template.color}15` : 'none'
                    }}
                  >
                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {template.isPopular && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                          <Star className="h-3 w-3" />
                          Beliebt
                        </span>
                      )}
                      {template.isNew && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                          Neu
                        </span>
                      )}
                    </div>

                    {/* Icon & Title */}
                    <div className="flex items-start gap-4 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{
                          background: `linear-gradient(135deg, ${template.color} 0%, ${template.color}CC 100%)`,
                          boxShadow: `0 4px 20px ${template.color}40`
                        }}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${complexity.color}20`,
                              color: complexity.color
                            }}
                          >
                            {complexity.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {template.estimatedSetup}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Tools Preview */}
                    <div className="flex flex-wrap gap-2">
                      {template.tools.slice(0, 3).map((tool, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded-md text-xs bg-card/5 text-muted-foreground border border-white/10"
                        >
                          {tool}
                        </span>
                      ))}
                      {template.tools.length > 3 && (
                        <span className="px-2 py-1 rounded-md text-xs bg-card/5 text-muted-foreground border border-white/10">
                          +{template.tools.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Hover Arrow */}
                    <div
                      className={`absolute right-4 bottom-4 transition-all duration-300 ${
                        isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                      }`}
                    >
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${template.color}20` }}
                      >
                        <ChevronRight
                          className="h-4 w-4"
                          style={{ color: template.color }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t border-white/10 flex items-center justify-between" style={{ background: 'rgba(17, 24, 39, 0.95)' }}>
          <p className="text-sm text-muted-foreground">
            {filteredTemplates.length} von {AGENT_TEMPLATES.length} Templates
          </p>
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Alle Templates sind anpassbar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
