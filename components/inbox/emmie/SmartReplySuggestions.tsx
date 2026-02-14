'use client';

/**
 * Smart Reply Suggestions for Emmie
 *
 * Shows contextual reply chips under agent messages.
 * Click sends the prompt to Emmie to compose a full reply.
 */

import { useState, useMemo } from 'react';
import { Reply, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartReplySuggestionsProps {
  onSelectReply: (prompt: string) => void;
  agentColor?: string;
  messageContent?: string;
}

type Tone = 'formell' | 'neutral' | 'freundlich';

const toneLabels: Record<Tone, string> = {
  formell: 'Formell',
  neutral: 'Neutral',
  freundlich: 'Freundlich',
};

// Generate contextual reply suggestions based on message content
function getSuggestions(content?: string): string[] {
  if (!content) return ['Danke, erledigt!', 'Klingt gut!', 'Ich kuemmere mich darum'];

  const lower = content.toLowerCase();

  // Meeting/Termin context
  if (lower.includes('termin') || lower.includes('meeting') || lower.includes('besprechung')) {
    return ['Termin passt, danke!', 'Koennen wir verschieben?', 'Ich bestaege den Termin'];
  }

  // Question context
  if (lower.includes('frage') || lower.includes('?') || lower.includes('koennten sie')) {
    return ['Ja, gerne!', 'Ich pruefe das', 'Leider nicht moeglich'];
  }

  // Request context
  if (lower.includes('bitte') || lower.includes('koennten') || lower.includes('wuerden')) {
    return ['Wird erledigt!', 'Ich kuemmere mich darum', 'Brauche mehr Infos'];
  }

  // Thank you context
  if (lower.includes('danke') || lower.includes('vielen dank')) {
    return ['Gern geschehen!', 'Keine Ursache', 'Freut mich!'];
  }

  // Default suggestions
  return ['Danke, erledigt!', 'Klingt gut, machen wir so', 'Termin vereinbaren'];
}

export function SmartReplySuggestions({
  onSelectReply,
  agentColor = '#8B5CF6',
  messageContent,
}: SmartReplySuggestionsProps) {
  const [selectedTone, setSelectedTone] = useState<Tone>('neutral');
  const [showToneSelector, setShowToneSelector] = useState(false);

  const suggestions = useMemo(() => getSuggestions(messageContent), [messageContent]);

  const handleSelect = (suggestion: string) => {
    const toneInstruction = selectedTone === 'neutral'
      ? ''
      : ` Verwende einen ${selectedTone}en Ton.`;
    const prompt = `Formuliere eine Antwort-Email basierend auf: "${suggestion}"${toneInstruction}. Antworte auf die letzte Email im Thread.`;
    onSelectReply(prompt);
  };

  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {/* Reply icon */}
      <Reply className="w-3 h-3 text-white/20 flex-shrink-0" />

      {/* Suggestion chips */}
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => handleSelect(suggestion)}
          className="px-2.5 py-1 text-[11px] text-white/50 bg-white/[0.04] border border-white/[0.06] rounded-full hover:bg-white/[0.08] hover:text-white/70 hover:border-white/[0.10] transition-all"
        >
          {suggestion}
        </button>
      ))}

      {/* Tone selector */}
      <div className="relative">
        <button
          onClick={() => setShowToneSelector(!showToneSelector)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/30 hover:text-white/50 rounded-full transition-colors"
        >
          <span>{toneLabels[selectedTone]}</span>
          <ChevronDown className="w-2.5 h-2.5" />
        </button>

        {showToneSelector && (
          <div className="absolute bottom-full right-0 mb-1 bg-[#111] border border-white/[0.08] rounded-lg shadow-lg z-10 py-0.5 min-w-[100px]">
            {(Object.keys(toneLabels) as Tone[]).map((tone) => (
              <button
                key={tone}
                onClick={() => { setSelectedTone(tone); setShowToneSelector(false); }}
                className={cn(
                  'w-full px-3 py-1.5 text-xs text-left transition-colors',
                  selectedTone === tone
                    ? 'text-violet-400 bg-violet-500/10'
                    : 'text-white/50 hover:text-white/70 hover:bg-white/[0.06]'
                )}
              >
                {toneLabels[tone]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
