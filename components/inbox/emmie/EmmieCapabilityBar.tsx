'use client';

import { PenLine, LayoutTemplate, Search, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmmieCapabilityBarProps {
  onAction: (prompt: string) => void;
  onOpenTemplates: () => void;
  agentColor: string;
}

const actions = [
  {
    icon: PenLine,
    label: 'Verfassen',
    prompt: 'Ich möchte eine neue E-Mail verfassen. Frag mich nach Empfänger, Betreff und Inhalt.',
  },
  {
    icon: LayoutTemplate,
    label: 'Vorlagen',
    isTemplateAction: true,
    prompt: '',
  },
  {
    icon: Search,
    label: 'Suchen',
    prompt: 'Durchsuche meinen Posteingang nach ungelesenen E-Mails und fasse die wichtigsten zusammen.',
  },
  {
    icon: BarChart3,
    label: 'Stats',
    prompt: 'Erstelle eine Analyse meines Posteingangs: Wie viele ungelesene Mails habe ich, von wem, und welche sind dringend?',
  },
];

export function EmmieCapabilityBar({ onAction, onOpenTemplates, agentColor }: EmmieCapabilityBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => {
              if (action.isTemplateAction) {
                onOpenTemplates();
              } else {
                onAction(action.prompt);
              }
            }}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/50',
              'hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-all'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
