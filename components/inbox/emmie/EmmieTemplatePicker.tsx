'use client';

import { useState, useMemo } from 'react';
import { X, Search, Mail, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAllTemplates,
  getTemplatesByCategory,
  searchTemplates,
  type EmailTemplate,
} from '@/lib/agents/emmie/templates/email-templates';

interface EmmieTemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (prompt: string) => void;
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
  agentColor,
}: EmmieTemplatePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const filteredTemplates = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTemplates(searchQuery);
    }
    if (activeCategory === 'all') {
      return getAllTemplates();
    }
    return getTemplatesByCategory(activeCategory);
  }, [searchQuery, activeCategory]);

  const handleSelectTemplate = (template: EmailTemplate) => {
    const variablesList = template.variables.join(', ');
    const prompt = `Verwende die Vorlage '${template.name}' und hilf mir die Variablen auszufüllen: ${variablesList}`;
    onSelectTemplate(prompt);
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
          'fixed right-0 top-0 h-full w-80 bg-[#111] border-l border-white/[0.08]',
          'shadow-2xl z-50 flex flex-col',
          'animate-in slide-in-from-right duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-white">E-Mail Vorlagen</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
                           hover:bg-white/[0.06] hover:border-white/[0.10] transition-all"
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
                </div>

                {/* Use Template Button */}
                <button
                  onClick={() => handleSelectTemplate(template)}
                  className="flex items-center gap-1.5 mt-2.5 ml-6.5 px-2.5 py-1 text-[11px]
                             rounded-lg transition-all
                             text-white/40 hover:text-violet-400 hover:bg-violet-500/10"
                >
                  <span>Verwenden</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
