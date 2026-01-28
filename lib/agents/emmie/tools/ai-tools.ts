/**
 * Emmie AI-Powered Tool Definitions
 *
 * Advanced AI-enhanced email tools that leverage LLM capabilities
 * for summarization, action extraction, smart replies, and more.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// ============================================================
// AI-POWERED TOOLS - Smart email operations with LLM
// ============================================================

/**
 * Summarize inbox - AI-based summary of unread emails
 */
export const GMAIL_SUMMARIZE_INBOX_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_summarize_inbox',
    description: 'Erstellt eine KI-gestützte Zusammenfassung aller ungelesenen E-Mails im Posteingang. Gruppiert nach Wichtigkeit und Absender.',
    parameters: {
      type: 'object',
      properties: {
        maxEmails: {
          type: 'number',
          description: 'Maximale Anzahl der E-Mails für die Zusammenfassung (1-50). Standard: 20'
        },
        groupBy: {
          type: 'string',
          enum: ['sender', 'category', 'priority', 'date'],
          description: 'Gruppierung der Zusammenfassung. Standard: priority'
        },
        includeActionItems: {
          type: 'boolean',
          description: 'Action Items automatisch extrahieren. Standard: true'
        }
      }
    }
  }
};

/**
 * Extract action items - Find todos and deadlines in emails
 */
export const GMAIL_EXTRACT_ACTION_ITEMS_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_extract_action_items',
    description: 'Extrahiert To-Dos, Aufgaben und Deadlines aus E-Mails. Erkennt Fristen, Anfragen und benötigte Aktionen.',
    parameters: {
      type: 'object',
      properties: {
        messageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Spezifische Message-IDs zum Analysieren. Wenn leer, werden ungelesene E-Mails analysiert.'
        },
        query: {
          type: 'string',
          description: 'Gmail-Suchquery um E-Mails zu filtern (z.B. "newer_than:7d")'
        },
        maxEmails: {
          type: 'number',
          description: 'Maximale Anzahl zu analysierender E-Mails. Standard: 20'
        },
        priority: {
          type: 'string',
          enum: ['all', 'urgent', 'high', 'normal'],
          description: 'Filter nach Priorität der Action Items. Standard: all'
        }
      }
    }
  }
};

/**
 * Schedule send - Send email at a specific time
 */
export const GMAIL_SCHEDULE_SEND_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_schedule_send',
    description: 'Plant eine E-Mail zum späteren Versand. Die E-Mail wird als Entwurf gespeichert und zum angegebenen Zeitpunkt automatisch gesendet.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Empfänger E-Mail-Adresse(n). Mehrere mit Komma getrennt.'
        },
        subject: {
          type: 'string',
          description: 'E-Mail-Betreff'
        },
        body: {
          type: 'string',
          description: 'E-Mail-Inhalt. Kann HTML enthalten.'
        },
        scheduledTime: {
          type: 'string',
          description: 'Geplanter Versandzeitpunkt als ISO-String oder relative Angabe (z.B. "2024-12-25T09:00:00Z", "morgen 9:00", "in 2 Stunden")'
        },
        timezone: {
          type: 'string',
          description: 'Zeitzone (z.B. "Europe/Berlin"). Standard: lokale Zeitzone'
        },
        cc: {
          type: 'string',
          description: 'CC-Empfänger (optional)'
        }
      },
      required: ['to', 'subject', 'body', 'scheduledTime']
    }
  }
};

/**
 * Semantic search - AI-powered email search
 */
export const GMAIL_SEMANTIC_SEARCH_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_semantic_search',
    description: 'KI-gestützte semantische Suche in E-Mails. Findet E-Mails basierend auf Bedeutung, nicht nur Schlüsselwörtern. Ideal für vage Suchanfragen.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natürlichsprachliche Suchanfrage (z.B. "Die E-Mail wo jemand nach dem Budget gefragt hat", "Alle E-Mails über das Projekt mit dem Kunden")'
        },
        maxResults: {
          type: 'number',
          description: 'Maximale Anzahl Ergebnisse (1-50). Standard: 10'
        },
        dateRange: {
          type: 'string',
          enum: ['week', 'month', 'quarter', 'year', 'all'],
          description: 'Zeitraum für die Suche. Standard: month'
        },
        includeSnippet: {
          type: 'boolean',
          description: 'Relevante Textausschnitte anzeigen. Standard: true'
        }
      },
      required: ['query']
    }
  }
};

/**
 * Generate reply - AI-powered reply suggestions
 */
export const GMAIL_GENERATE_REPLY_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_generate_reply',
    description: 'Generiert KI-gestützte Antwortvorschläge für eine E-Mail. Berücksichtigt Kontext, Ton und Thread-Historie.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Message-ID der E-Mail, auf die geantwortet werden soll'
        },
        tone: {
          type: 'string',
          enum: ['formal', 'friendly', 'professional', 'casual', 'assertive', 'apologetic'],
          description: 'Gewünschter Ton der Antwort. Standard: professional'
        },
        intent: {
          type: 'string',
          description: 'Was soll die Antwort erreichen? (z.B. "Termin bestätigen", "Preis verhandeln", "Höflich ablehnen")'
        },
        includeContext: {
          type: 'boolean',
          description: 'Thread-Kontext für bessere Antwort laden. Standard: true'
        },
        length: {
          type: 'string',
          enum: ['short', 'medium', 'detailed'],
          description: 'Gewünschte Länge der Antwort. Standard: medium'
        },
        language: {
          type: 'string',
          description: 'Sprache der Antwort (z.B. "de", "en"). Standard: Sprache der Original-E-Mail'
        }
      },
      required: ['messageId']
    }
  }
};

/**
 * Contact history - Communication history with a contact
 */
export const GMAIL_CONTACT_HISTORY_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_contact_history',
    description: 'Ruft die Kommunikationshistorie mit einem Kontakt ab. Zeigt Statistiken, häufige Themen und die letzten Interaktionen.',
    parameters: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'E-Mail-Adresse des Kontakts'
        },
        includeStats: {
          type: 'boolean',
          description: 'Statistiken (Anzahl E-Mails, Antwortzeiten) inkludieren. Standard: true'
        },
        maxEmails: {
          type: 'number',
          description: 'Anzahl der letzten E-Mails zum Anzeigen. Standard: 10'
        },
        summarize: {
          type: 'boolean',
          description: 'KI-Zusammenfassung der Beziehung erstellen. Standard: true'
        }
      },
      required: ['email']
    }
  }
};

/**
 * Find attachments - Search for emails with specific attachments
 */
export const GMAIL_FIND_ATTACHMENTS_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_find_attachments',
    description: 'Sucht E-Mails mit Anhängen. Kann nach Dateityp, Größe und Absender filtern.',
    parameters: {
      type: 'object',
      properties: {
        fileType: {
          type: 'string',
          description: 'Dateityp-Filter (z.B. "pdf", "xlsx", "docx", "image", "all"). Standard: all'
        },
        from: {
          type: 'string',
          description: 'E-Mails nur von diesem Absender'
        },
        query: {
          type: 'string',
          description: 'Zusätzliche Gmail-Suchquery'
        },
        minSize: {
          type: 'string',
          description: 'Mindestgröße (z.B. "1mb", "500kb")'
        },
        maxSize: {
          type: 'string',
          description: 'Maximalgröße (z.B. "10mb")'
        },
        dateRange: {
          type: 'string',
          enum: ['week', 'month', 'quarter', 'year', 'all'],
          description: 'Zeitraum. Standard: month'
        },
        maxResults: {
          type: 'number',
          description: 'Maximale Anzahl Ergebnisse. Standard: 20'
        }
      }
    }
  }
};

/**
 * Unsubscribe suggestions - Find newsletters to unsubscribe from
 */
export const GMAIL_UNSUBSCRIBE_SUGGESTIONS_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_unsubscribe_suggestions',
    description: 'Analysiert das Postfach und schlägt Newsletter/Marketing-E-Mails vor, die abgemeldet werden können. Zeigt Unsubscribe-Links.',
    parameters: {
      type: 'object',
      properties: {
        minCount: {
          type: 'number',
          description: 'Mindestanzahl E-Mails von einem Absender für Vorschlag. Standard: 3'
        },
        analyzePeriod: {
          type: 'string',
          enum: ['month', 'quarter', 'year'],
          description: 'Analysezeitraum. Standard: quarter'
        },
        excludeDomains: {
          type: 'array',
          items: { type: 'string' },
          description: 'Domains ausschließen (z.B. ["company.com", "wichtig.de"])'
        },
        sortBy: {
          type: 'string',
          enum: ['frequency', 'unread_ratio', 'last_opened'],
          description: 'Sortierung der Vorschläge. Standard: frequency'
        }
      }
    }
  }
};

/**
 * Translate email - Translate email content
 */
export const GMAIL_TRANSLATE_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_translate',
    description: 'Übersetzt den Inhalt einer E-Mail in eine andere Sprache. Behält Formatierung bei.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Message-ID der zu übersetzenden E-Mail'
        },
        targetLanguage: {
          type: 'string',
          description: 'Zielsprache (z.B. "de", "en", "fr", "es", "zh", "ja"). Standard: de'
        },
        includeOriginal: {
          type: 'boolean',
          description: 'Original-Text mit anzeigen. Standard: false'
        },
        translateSubject: {
          type: 'boolean',
          description: 'Auch Betreff übersetzen. Standard: true'
        }
      },
      required: ['messageId']
    }
  }
};

/**
 * Snooze email - Remind about email later
 */
export const GMAIL_SNOOZE_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_snooze',
    description: 'Verschiebt eine E-Mail und erinnert später daran. Die E-Mail erscheint zum gewählten Zeitpunkt wieder als ungelesen im Posteingang.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Message-ID der E-Mail zum Snoozen'
        },
        snoozeUntil: {
          type: 'string',
          description: 'Zeitpunkt der Erinnerung als ISO-String oder relative Angabe (z.B. "morgen 9:00", "in 3 Stunden", "nächsten Montag")'
        },
        note: {
          type: 'string',
          description: 'Optionale Notiz zur Erinnerung'
        }
      },
      required: ['messageId', 'snoozeUntil']
    }
  }
};

// ============================================================
// TOOL COLLECTIONS
// ============================================================

/**
 * All AI-powered tools for Emmie
 */
export const EMMIE_AI_TOOLS: ChatCompletionTool[] = [
  GMAIL_SUMMARIZE_INBOX_TOOL,
  GMAIL_EXTRACT_ACTION_ITEMS_TOOL,
  GMAIL_SCHEDULE_SEND_TOOL,
  GMAIL_SEMANTIC_SEARCH_TOOL,
  GMAIL_GENERATE_REPLY_TOOL,
  GMAIL_CONTACT_HISTORY_TOOL,
  GMAIL_FIND_ATTACHMENTS_TOOL,
  GMAIL_UNSUBSCRIBE_SUGGESTIONS_TOOL,
  GMAIL_TRANSLATE_TOOL,
  GMAIL_SNOOZE_TOOL,
];

/**
 * Tool name to display name mapping (German)
 */
export const AI_TOOL_DISPLAY_NAMES: Record<string, string> = {
  gmail_summarize_inbox: 'Postfach zusammenfassen',
  gmail_extract_action_items: 'Aufgaben extrahieren',
  gmail_schedule_send: 'E-Mail planen',
  gmail_semantic_search: 'Intelligente Suche',
  gmail_generate_reply: 'Antwort generieren',
  gmail_contact_history: 'Kontakt-Historie',
  gmail_find_attachments: 'Anhänge suchen',
  gmail_unsubscribe_suggestions: 'Abmelde-Vorschläge',
  gmail_translate: 'E-Mail übersetzen',
  gmail_snooze: 'E-Mail verschieben',
};

/**
 * Tool name to emoji mapping
 */
export const AI_TOOL_EMOJIS: Record<string, string> = {
  gmail_summarize_inbox: '📋',
  gmail_extract_action_items: '✅',
  gmail_schedule_send: '⏰',
  gmail_semantic_search: '🧠',
  gmail_generate_reply: '✍️',
  gmail_contact_history: '👤',
  gmail_find_attachments: '📎',
  gmail_unsubscribe_suggestions: '🚫',
  gmail_translate: '🌐',
  gmail_snooze: '⏳',
};

/**
 * Get display string for an AI tool
 */
export function getAIToolDisplay(toolName: string): string {
  const emoji = AI_TOOL_EMOJIS[toolName] || '🤖';
  const name = AI_TOOL_DISPLAY_NAMES[toolName] || toolName;
  return `${emoji} ${name}`;
}
