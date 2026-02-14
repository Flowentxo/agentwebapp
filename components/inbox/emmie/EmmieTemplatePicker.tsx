'use client';

/**
 * Emmie Template Command Center
 *
 * Features:
 * - Template search + category filter
 * - Variable form with live preview
 * - "In Composer oeffnen" button (fills EmailComposer)
 * - "Per Chat verwenden" button (sends prompt to Emmie)
 */

import { useState, useMemo, useCallback } from 'react';
import { X, Search, Mail, ArrowRight, Eye, PenLine, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllTemplates,
  getTemplatesByCategory,
  searchTemplates,
  fillTemplate,
  type EmailTemplate,
} from '@/lib/agents/emmie/templates/email-templates';

interface EmmieTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (prompt: string) => void;
  onOpenInComposer?: (data: { subject: string; body: string }) => void;
  agentColor: string;
}

type CategoryFilter = 'all' | EmailTemplate['category'];

const categoryLabels: Record<CategoryFilter, string> = {
  all: 'Alle',
  'follow-up': 'Follow-up',
  meeting: 'Meeting',
  intro: 'Intro',
  sales: 'Sales',
  support: 'Support',
  reply: 'Antwort',
};

export function EmmieTemplatePicker({
  isOpen,
  onClose,
  onSelectTemplate,
  onOpenInComposer,
  agentColor,
}: EmmieTemplatePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const filteredTemplates = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTemplates(searchQuery);
    }
    if (activeCategory === 'all') {
      return getAllTemplates();
    }
    return getTemplatesByCategory(activeCategory);
  }, [searchQuery, activeCategory]);

  // Live preview with filled variables
  const filledPreview = useMemo(() => {
    if (!selectedTemplate) return null;
    return fillTemplate(selectedTemplate, variableValues);
  }, [selectedTemplate, variableValues]);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    // Initialize empty variable values
    const initial: Record<string, string> = {};
    template.variables.forEach((v) => { initial[v] = ''; });
    setVariableValues(initial);
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setVariableValues({});
  };

  const handleUseViaChat = useCallback(() => {
    if (!selectedTemplate) return;
    const variablesList = selectedTemplate.variables.join(', ');
    const filledVars = Object.entries(variableValues)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: "${v}"`)
      .join(', ');

    const prompt = filledVars
      ? `Verwende die Vorlage '${selectedTemplate.name}' mit folgenden Werten: ${filledVars}. Fuelle fehlende Variablen aus: ${variablesList}`
      : `Verwende die Vorlage '${selectedTemplate.name}' und hilf mir die Variablen auszufuellen: ${variablesList}`;

    onSelectTemplate(prompt);
    handleBack();
  }, [selectedTemplate, variableValues, onSelectTemplate]);

  const handleOpenInComposer = useCallback(() => {
    if (!selectedTemplate || !filledPreview || !onOpenInComposer) return;
    onOpenInComposer({ subject: filledPreview.subject, body: filledPreview.body });
    handleBack();
    onClose();
  }, [selectedTemplate, filledPreview, onOpenInComposer, onClose]);

  const handleVariableChange = (key: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [key]: value }));
  };

  // Human-readable variable labels
  const variableLabel = (key: string): string => {
    const labels: Record<string, string> = {
      name: 'Name',
      meetingContext: 'Meeting-Kontext',
      nextSteps: 'Naechste Schritte',
      proposalDate: 'Angebotsdatum',
      meetingTopic: 'Meeting-Thema',
      duration: 'Dauer',
      proposedTimes: 'Vorgeschlagene Zeiten',
      company: 'Firma',
      role: 'Rolle',
      topic: 'Thema',
      reason: 'Grund',
      product: 'Produkt',
      benefit: 'Vorteil',
      issue: 'Problem',
      solution: 'Loesung',
      deadline: 'Deadline',
      context: 'Kontext',
    };
    return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full bg-[#111] border-l border-white/[0.08]',
          'shadow-2xl z-50 flex flex-col',
          'animate-in slide-in-from-right duration-200',
          selectedTemplate ? 'w-[480px]' : 'w-80'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          {selectedTemplate ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBack}
                className="p-1 text-white/40 hover:text-white/80 rounded-lg transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
              <h3 className="text-sm font-medium text-white truncate">{selectedTemplate.name}</h3>
            </div>
          ) : (
            <h3 className="text-sm font-medium text-white">E-Mail Vorlagen</h3>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Detail View */}
        {selectedTemplate ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Variable Form + Preview Split */}
            <div className="flex-1 flex overflow-hidden">
              {/* Variables Form */}
              <div className="w-1/2 border-r border-white/[0.06] overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <p className="text-[11px] text-white/40 mb-2">Variablen ausfuellen:</p>
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable}>
                    <label className="block text-xs text-white/60 mb-1">
                      {variableLabel(variable)}
                    </label>
                    {variable.includes('Steps') || variable.includes('Times') || variable.includes('context') ? (
                      <textarea
                        value={variableValues[variable] || ''}
                        onChange={(e) => handleVariableChange(variable, e.target.value)}
                        placeholder={`{{${variable}}}`}
                        rows={3}
                        className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-white/25 focus:outline-none focus:border-violet-500/30 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={variableValues[variable] || ''}
                        onChange={(e) => handleVariableChange(variable, e.target.value)}
                        placeholder={`{{${variable}}}`}
                        className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-white/25 focus:outline-none focus:border-violet-500/30"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Live Preview */}
              <div className="w-1/2 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="flex items-center gap-1.5 mb-3">
                  <Eye className="w-3.5 h-3.5 text-white/40" />
                  <p className="text-[11px] text-white/40">Live-Vorschau:</p>
                </div>
                {filledPreview && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <div className="text-xs text-white/50 mb-1">Betreff:</div>
                    <div className="text-sm text-white font-medium mb-3">
                      {filledPreview.subject || '(kein Betreff)'}
                    </div>
                    <div className="h-px bg-white/[0.06] mb-3" />
                    <div className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                      {filledPreview.body || '(kein Inhalt)'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-white/[0.06]">
              {onOpenInComposer && (
                <button
                  onClick={handleOpenInComposer}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  In Composer oeffnen
                </button>
              )}
              <button
                onClick={handleUseViaChat}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-white/60 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/80 rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Per Chat verwenden
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                <input
                  type="text"
                  placeholder="Vorlage suchen..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value) setActiveCategory('all');
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08]
                             rounded-lg text-white placeholder-white/40 focus:outline-none
                             focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/10"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {(Object.keys(categoryLabels) as CategoryFilter[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setSearchQuery('');
                  }}
                  className={cn(
                    'px-2.5 py-1 text-[11px] rounded-full transition-all',
                    activeCategory === cat
                      ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
                      : 'text-white/40 bg-white/[0.04] border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.06]'
                  )}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail className="w-8 h-8 text-white/20 mb-3" />
                  <p className="text-sm text-white/40">Keine Vorlagen gefunden</p>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group bg-white/[0.03] border border-white/[0.06] rounded-xl p-3
                               hover:bg-white/[0.06] hover:border-white/[0.10] transition-all cursor-pointer"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start gap-2.5">
                      <Mail
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: agentColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white/80">
                          {template.name}
                        </div>
                        <div className="text-[11px] text-white/40 mt-0.5 line-clamp-2">
                          {template.description}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="px-1.5 py-0.5 text-[10px] text-white/30 bg-white/[0.04] rounded">
                            {categoryLabels[template.category] || template.category}
                          </span>
                          <span className="text-[10px] text-white/25">
                            {template.variables.length} Felder
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 mt-0.5 flex-shrink-0 transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
