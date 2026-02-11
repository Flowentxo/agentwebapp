'use client';

import { Mail, PenLine, LayoutTemplate, Search, BarChart3 } from 'lucide-react';

interface EmmieWelcomeScreenProps {
  onSendPrompt: (prompt: string) => void;
  agentColor: string;
}

const quickActions = [
  {
    icon: PenLine,
    label: 'E-Mail verfassen',
    description: 'Neue E-Mail schreiben',
    prompt: 'Ich möchte eine neue E-Mail verfassen. Frag mich nach Empfänger, Betreff und Inhalt.',
  },
  {
    icon: LayoutTemplate,
    label: 'Vorlage verwenden',
    description: 'Aus 24 Vorlagen wählen',
    prompt: 'Zeige mir alle verfügbaren E-Mail Vorlagen sortiert nach Kategorie.',
  },
  {
    icon: Search,
    label: 'Posteingang durchsuchen',
    description: 'E-Mails finden & zusammenfassen',
    prompt: 'Durchsuche meinen Posteingang nach ungelesenen E-Mails und fasse die wichtigsten zusammen.',
  },
  {
    icon: BarChart3,
    label: 'Inbox Analyse',
    description: 'Überblick & Prioritäten',
    prompt: 'Erstelle eine Analyse meines Posteingangs: Wie viele ungelesene Mails habe ich, von wem, und welche sind dringend?',
  },
];

const suggestedPrompts = [
  'Schreibe eine Follow-up Email an...',
  'Fasse meine ungelesenen Mails zusammen',
  'Erstelle eine Email Kampagne für...',
];

export function EmmieWelcomeScreen({ onSendPrompt, agentColor }: EmmieWelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
      {/* Avatar */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: `${agentColor}20` }}
      >
        <Mail className="w-8 h-8" style={{ color: agentColor }} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-zinc-100 mb-1">Emmie</h3>
      <p className="text-sm text-zinc-400 max-w-sm mb-8">
        Dein Email Marketing Assistent — E-Mails verfassen, Vorlagen nutzen, Posteingang analysieren.
      </p>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 gap-3 max-w-sm w-full mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => onSendPrompt(action.prompt)}
              className="flex flex-col items-start gap-2 p-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl
                         hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-left group"
            >
              <Icon
                className="w-5 h-5 transition-colors"
                style={{ color: agentColor }}
              />
              <div>
                <div className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                  {action.label}
                </div>
                <div className="text-[11px] text-white/40 mt-0.5">
                  {action.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Suggested Prompts */}
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSendPrompt(prompt)}
            className="px-3 py-1.5 text-xs text-white/60 bg-white/[0.04] border border-white/[0.08]
                       rounded-full hover:bg-white/[0.08] hover:text-white/80 transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
