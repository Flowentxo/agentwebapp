'use client';

/**
 * FEATURE TOOLTIPS - Agent Revolution
 *
 * Specialized tooltips for explaining complex options in the agent creation wizard
 * Uses Radix UI Tooltip primitives
 */

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info, AlertCircle, Lightbulb, Zap } from 'lucide-react';

// ======================
// TYPES
// ======================

export interface FeatureTooltipInfo {
  title: string;
  description: string;
  tips?: string[];
  example?: string;
  learnMoreUrl?: string;
}

export type TooltipVariant = 'default' | 'info' | 'warning' | 'tip';

// ======================
// TOOLTIP CONTENT DEFINITIONS
// ======================

export const AGENT_TOOLTIPS: Record<string, FeatureTooltipInfo> = {
  // Agent Type Tooltips
  agentType: {
    title: 'Agent-Typ',
    description: 'Bestimmt die Grundfunktionalität deines Agents. Wähle basierend auf deinem Hauptanwendungsfall.',
    tips: [
      'Conversational: Für Chat und Kundeninteraktion',
      'Automation: Für wiederkehrende Aufgaben',
      'Research: Für Datenanalyse und Recherche',
      'Custom: Volle Kontrolle über alle Einstellungen'
    ]
  },

  // Tone Selection
  agentTone: {
    title: 'Kommunikationston',
    description: 'Legt fest, wie dein Agent mit Nutzern kommuniziert. Der Ton sollte zu deiner Zielgruppe passen.',
    tips: [
      'Professionell: Für B2B und formelle Kontexte',
      'Freundlich: Für Consumer-Produkte',
      'Casual: Für jüngere Zielgruppen'
    ],
    example: 'Ein Support-Agent für Banken sollte "Professionell" verwenden.'
  },

  // Industry Selection
  industry: {
    title: 'Branche',
    description: 'Die Branchenauswahl optimiert den Agent für branchenspezifische Terminologie und Best Practices.',
    tips: [
      'Beeinflusst Fachvokabular',
      'Passt Compliance-Hinweise an',
      'Optimiert für branchenübliche Workflows'
    ]
  },

  // Tools Selection
  toolsSelection: {
    title: 'Tool-Auswahl',
    description: 'Tools erweitern die Fähigkeiten deines Agents. Jedes Tool fügt spezifische Funktionen hinzu.',
    tips: [
      'Weniger ist mehr - wähle nur nötige Tools',
      'Tools können später hinzugefügt werden',
      'Prüfe Berechtigungen für jedes Tool'
    ]
  },

  // API Integration
  apiIntegration: {
    title: 'API-Integration',
    description: 'Verbinde deinen Agent mit externen Systemen über APIs.',
    tips: [
      'REST und GraphQL werden unterstützt',
      'API-Keys werden verschlüsselt gespeichert',
      'Rate-Limits werden automatisch beachtet'
    ],
    example: 'CRM-Integration ermöglicht Zugriff auf Kundendaten.'
  },

  // Webhook Configuration
  webhooks: {
    title: 'Webhook-Konfiguration',
    description: 'Webhooks ermöglichen Echtzeit-Benachrichtigungen an externe Systeme.',
    tips: [
      'HTTPS-URLs sind erforderlich',
      'Unterstützt POST-Requests',
      'Retry-Logik ist eingebaut'
    ]
  },

  // Trigger Configuration
  triggers: {
    title: 'Trigger',
    description: 'Trigger starten automatische Agent-Aktionen basierend auf Events oder Zeitplänen.',
    tips: [
      'Event-basiert: Reagiert auf Systemereignisse',
      'Zeitgesteuert: CRON-basierte Ausführung',
      'Manuell: Nur auf Anfrage'
    ]
  },

  // Memory Settings
  memorySettings: {
    title: 'Gedächtnis-Einstellungen',
    description: 'Bestimmt wie lange und wie viel Kontext der Agent sich merkt.',
    tips: [
      'Kurzzeitgedächtnis: Aktuelle Konversation',
      'Langzeitgedächtnis: Persistente Informationen',
      'Mehr Gedächtnis = höhere Kosten'
    ]
  },

  // Response Format
  responseFormat: {
    title: 'Antwort-Format',
    description: 'Legt fest, in welchem Format der Agent antwortet.',
    tips: [
      'Text: Einfache Textantworten',
      'JSON: Strukturierte Daten',
      'Markdown: Formatierte Inhalte'
    ]
  },

  // Temperature Setting
  temperature: {
    title: 'Kreativität (Temperature)',
    description: 'Steuert die Variabilität der Antworten. Niedrig = präziser, Hoch = kreativer.',
    tips: [
      '0.0-0.3: Faktentreue Antworten',
      '0.4-0.7: Ausgewogene Kreativität',
      '0.8-1.0: Maximale Kreativität'
    ],
    example: 'Für technischen Support: 0.2, Für Content-Erstellung: 0.8'
  },

  // Max Tokens
  maxTokens: {
    title: 'Maximale Token',
    description: 'Begrenzt die Länge der Antworten. 1 Token ≈ 4 Zeichen in Deutsch.',
    tips: [
      '256: Kurze Antworten',
      '1024: Standard-Antworten',
      '4096: Lange, detaillierte Antworten'
    ]
  },

  // Fallback Behavior
  fallbackBehavior: {
    title: 'Fallback-Verhalten',
    description: 'Definiert, was passiert, wenn der Agent keine Antwort geben kann.',
    tips: [
      'Eskalation an Menschen',
      'Standard-Antwort senden',
      'Alternative Aktion vorschlagen'
    ]
  },

  // Privacy Settings
  privacySettings: {
    title: 'Datenschutz-Einstellungen',
    description: 'Konfiguriert die Handhabung sensibler Daten.',
    tips: [
      'PII-Maskierung aktivieren',
      'Datenretention festlegen',
      'DSGVO-Konformität prüfen'
    ]
  }
};

// ======================
// COMPONENTS
// ======================

/**
 * Info Tooltip - Small help icon with tooltip
 */
export function InfoTooltip({
  tooltipKey,
  side = 'right',
  className = ''
}: {
  tooltipKey: keyof typeof AGENT_TOOLTIPS;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}) {
  const info = AGENT_TOOLTIPS[tooltipKey];
  if (!info) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center p-0.5 rounded-full text-muted-foreground hover:text-gray-300 hover:bg-card/5 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${className}`}
            aria-label={`Mehr Informationen zu ${info.title}`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs p-0 overflow-hidden">
          <TooltipCard info={info} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Feature Tooltip - Larger tooltip with full details
 */
export function FeatureTooltip({
  info,
  children,
  side = 'right'
}: {
  info: FeatureTooltipInfo;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-sm p-0 overflow-hidden">
          <TooltipCard info={info} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Label With Tooltip - Common pattern for form labels
 */
export function LabelWithTooltip({
  label,
  tooltipKey,
  required = false,
  htmlFor,
  className = ''
}: {
  label: string;
  tooltipKey: keyof typeof AGENT_TOOLTIPS;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-gray-300"
      >
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <InfoTooltip tooltipKey={tooltipKey} />
    </div>
  );
}

/**
 * Internal TooltipCard component
 */
function TooltipCard({ info }: { info: FeatureTooltipInfo }) {
  return (
    <div className="p-3 space-y-2">
      {/* Title */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center">
          <Lightbulb className="h-3 w-3 text-purple-400" />
        </div>
        <span className="font-semibold text-white text-sm">{info.title}</span>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-300 leading-relaxed">
        {info.description}
      </p>

      {/* Tips */}
      {info.tips && info.tips.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <ul className="space-y-1">
            {info.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-purple-400 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Example */}
      {info.example && (
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-start gap-1.5">
            <Info className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-blue-300">{info.example}</span>
          </div>
        </div>
      )}

      {/* Learn More */}
      {info.learnMoreUrl && (
        <a
          href={info.learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block pt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          Mehr erfahren →
        </a>
      )}
    </div>
  );
}

/**
 * Quick Tip - Inline tip component
 */
export function QuickTip({
  children,
  variant = 'default'
}: {
  children: React.ReactNode;
  variant?: TooltipVariant;
}) {
  const styles = {
    default: {
      bg: 'bg-card/5',
      border: 'border-white/10',
      icon: <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />,
      text: 'text-muted-foreground'
    },
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: <Info className="h-3.5 w-3.5 text-blue-400" />,
      text: 'text-blue-300'
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: <AlertCircle className="h-3.5 w-3.5 text-amber-400" />,
      text: 'text-amber-300'
    },
    tip: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      icon: <Zap className="h-3.5 w-3.5 text-purple-400" />,
      text: 'text-purple-300'
    }
  };

  const style = styles[variant];

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg ${style.bg} border ${style.border}`}>
      {style.icon}
      <p className={`text-xs leading-relaxed ${style.text}`}>
        {children}
      </p>
    </div>
  );
}
