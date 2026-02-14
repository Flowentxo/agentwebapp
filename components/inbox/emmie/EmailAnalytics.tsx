'use client';

/**
 * Emmie Email Analytics Panel
 *
 * Features:
 * - Inbox overview stats
 * - Top contacts
 * - Newsletter cleanup suggestions
 * - Unanswered emails list
 */

import { useState, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Trash2,
  Clock,
  Loader2,
  ArrowRight,
  Mail,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPrompt: (prompt: string) => void;
  agentColor?: string;
}

interface AnalyticsSection {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  prompt: string;
  color: string;
  bg: string;
}

const sections: AnalyticsSection[] = [
  {
    id: 'contacts',
    icon: Users,
    title: 'Top Kontakte',
    description: 'Die 10 haeufigsten Email-Kontakte',
    prompt: 'Analysiere meine letzten 100 Emails und zeige mir meine Top 10 Kontakte nach Haeufigkeit. Zeige Name, Email und Anzahl der Nachrichten.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'newsletters',
    icon: Trash2,
    title: 'Newsletter Cleanup',
    description: 'Newsletter und Mailinglisten finden',
    prompt: 'Finde alle Newsletter und Mailinglisten in meinem Posteingang. Zeige mir welche ich abbestellen koennte und wie oft sie senden.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    id: 'unanswered',
    icon: Clock,
    title: 'Antwort ausstehend',
    description: 'Emails die eine Antwort erwarten',
    prompt: 'Finde Emails die an mich gerichtet sind und auf die ich noch nicht geantwortet habe. Sortiere nach Dringlichkeit.',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  {
    id: 'volume',
    icon: BarChart3,
    title: 'Email-Volumen',
    description: 'Emails pro Tag/Woche analysieren',
    prompt: 'Analysiere mein Email-Volumen der letzten 30 Tage. Wie viele Emails habe ich pro Tag gesendet und empfangen? Welcher Tag ist am aktivsten?',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
];

export function EmailAnalytics({
  isOpen,
  onClose,
  onSendPrompt,
  agentColor = '#8B5CF6',
}: EmailAnalyticsProps) {
  const [loadingSection, setLoadingSection] = useState<string | null>(null);

  const handleAnalyze = useCallback((section: AnalyticsSection) => {
    setLoadingSection(section.id);
    onSendPrompt(section.prompt);
    onClose();
    setTimeout(() => setLoadingSection(null), 1000);
  }, [onSendPrompt, onClose]);

  if (!isOpen) return null;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: agentColor }} />
          <h2 className="text-sm font-medium text-white">Email Analytics</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <p className="text-xs text-white/40 mb-2">
          Waehle eine Analyse - Emmie untersucht deinen Posteingang und zeigt die Ergebnisse im Chat.
        </p>

        {sections.map((section) => {
          const Icon = section.icon;
          const isLoading = loadingSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => handleAnalyze(section)}
              disabled={isLoading}
              className="w-full flex items-center gap-4 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.10] transition-all group text-left"
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', section.bg)}>
                {isLoading ? (
                  <Loader2 className={cn('w-5 h-5 animate-spin', section.color)} />
                ) : (
                  <Icon className={cn('w-5 h-5', section.color)} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  {section.title}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">{section.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0 transition-colors" />
            </button>
          );
        })}

        {/* Custom Analysis */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-[11px] text-white/30 mb-2">Oder frag Emmie direkt:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Wie schnell antworte ich durchschnittlich?',
              'Wer schreibt mir am meisten?',
              'Wie viele Emails sende ich pro Tag?',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => { onSendPrompt(prompt); onClose(); }}
                className="px-3 py-1.5 text-[11px] text-white/50 bg-white/[0.04] border border-white/[0.06] rounded-full hover:bg-white/[0.08] hover:text-white/70 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
