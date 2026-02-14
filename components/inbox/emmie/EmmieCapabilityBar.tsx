'use client';

import { PenLine, LayoutTemplate, Search, BarChart3, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmmieCapabilityBarProps {
  onAction: (prompt: string) => void;
  onOpenTemplates: () => void;
  onOpenComposer?: () => void;
  onOpenDashboard?: () => void;
  agentColor: string;
}

export function EmmieCapabilityBar({ onAction, onOpenTemplates, onOpenComposer, onOpenDashboard, agentColor }: EmmieCapabilityBarProps) {
  const actions = [
    {
      icon: PenLine,
      label: 'Verfassen',
      hint: 'C',
      handler: () => onOpenComposer ? onOpenComposer() : onAction('Ich möchte eine neue E-Mail verfassen. Frag mich nach Empfänger, Betreff und Inhalt.'),
    },
    {
      icon: LayoutTemplate,
      label: 'Vorlagen',
      hint: 'T',
      handler: () => onOpenTemplates(),
    },
    {
      icon: Search,
      label: 'Suchen',
      hint: '/',
      handler: () => onAction('Durchsuche meinen Posteingang nach ungelesenen E-Mails und fasse die wichtigsten zusammen.'),
    },
    {
      icon: Inbox,
      label: 'Dashboard',
      hint: 'D',
      handler: () => onOpenDashboard ? onOpenDashboard() : onAction('Erstelle eine Analyse meines Posteingangs: Wie viele ungelesene Mails habe ich, von wem, und welche sind dringend?'),
    },
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={action.handler}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-white/50',
              'hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-all group'
            )}
            title={`${action.label} (${action.hint})`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{action.label}</span>
            <kbd className="hidden group-hover:inline text-[9px] text-white/25 ml-0.5">{action.hint}</kbd>
          </button>
        );
      })}
    </div>
  );
}
