/**
 * Gmail Tool Definitions for Emmie Agent
 *
 * These tools enable Emmie to perform email operations via OpenAI Function Calling.
 * Each tool maps to a GmailUnifiedService method.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Search emails in Gmail
 */
export const GMAIL_SEARCH_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_search',
    description: 'Sucht Emails im Gmail-Postfach des Nutzers. Unterstützt Gmail-Suchoperatoren wie "from:", "to:", "subject:", "is:unread", "newer_than:", "older_than:", "has:attachment".',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail-Suchquery. Beispiele: "from:max@example.com", "subject:Rechnung", "is:unread", "newer_than:7d", "from:support@company.com is:unread"'
        },
        maxResults: {
          type: 'number',
          description: 'Maximale Anzahl Ergebnisse (1-50). Standard: 10'
        }
      },
      required: ['query']
    }
  }
};

/**
 * Read a specific email
 */
export const GMAIL_READ_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_read',
    description: 'Liest eine spezifische Email mit vollem Inhalt anhand der Message-ID.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Die Gmail Message-ID der zu lesenden Email'
        },
        includeAttachments: {
          type: 'boolean',
          description: 'Attachment-Informationen inkludieren. Standard: false'
        }
      },
      required: ['messageId']
    }
  }
};

/**
 * Send a new email
 */
export const GMAIL_SEND_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_send',
    description: 'Sendet eine neue Email. WICHTIG: Vor dem Senden sollte der Nutzer den Inhalt bestätigen.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Empfänger Email-Adresse(n). Mehrere mit Komma getrennt.'
        },
        subject: {
          type: 'string',
          description: 'Email-Betreff'
        },
        body: {
          type: 'string',
          description: 'Email-Inhalt. Kann HTML enthalten für Formatierung.'
        },
        cc: {
          type: 'string',
          description: 'CC-Empfänger (optional). Mehrere mit Komma getrennt.'
        },
        bcc: {
          type: 'string',
          description: 'BCC-Empfänger (optional). Mehrere mit Komma getrennt.'
        }
      },
      required: ['to', 'subject', 'body']
    }
  }
};

/**
 * Reply to an email
 */
export const GMAIL_REPLY_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_reply',
    description: 'Antwortet auf eine bestehende Email im selben Thread. Die Antwort wird korrekt verknüpft.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Message-ID der Email, auf die geantwortet wird'
        },
        body: {
          type: 'string',
          description: 'Antwort-Inhalt'
        },
        replyAll: {
          type: 'boolean',
          description: 'An alle Empfänger antworten. Standard: false'
        }
      },
      required: ['messageId', 'body']
    }
  }
};

/**
 * Get a full email thread
 */
export const GMAIL_GET_THREAD_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_get_thread',
    description: 'Lädt einen kompletten Email-Thread mit allen Nachrichten für Kontext.',
    parameters: {
      type: 'object',
      properties: {
        threadId: {
          type: 'string',
          description: 'Thread-ID des Email-Threads'
        }
      },
      required: ['threadId']
    }
  }
};

/**
 * Archive an email
 */
export const GMAIL_ARCHIVE_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_archive',
    description: 'Archiviert eine Email (entfernt das INBOX-Label, Email bleibt erhalten).',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Message-ID der zu archivierenden Email'
        }
      },
      required: ['messageId']
    }
  }
};

/**
 * Modify labels on an email
 */
export const GMAIL_LABEL_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_label',
    description: 'Ändert Labels einer Email. Kann Labels hinzufügen oder entfernen.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Message-ID der Email'
        },
        addLabels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels hinzufügen (z.B. ["STARRED", "IMPORTANT"])'
        },
        removeLabels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels entfernen (z.B. ["UNREAD"])'
        }
      },
      required: ['messageId']
    }
  }
};

/**
 * Move email to trash
 */
export const GMAIL_TRASH_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_trash',
    description: 'Verschiebt eine Email in den Papierkorb. ACHTUNG: Diese Aktion sollte bestätigt werden.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Message-ID der zu löschenden Email'
        }
      },
      required: ['messageId']
    }
  }
};

/**
 * Create a draft
 */
export const GMAIL_DRAFT_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_draft',
    description: 'Erstellt einen Email-Entwurf, der später bearbeitet und gesendet werden kann.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Empfänger Email-Adresse'
        },
        subject: {
          type: 'string',
          description: 'Betreff'
        },
        body: {
          type: 'string',
          description: 'Inhalt des Entwurfs'
        }
      },
      required: ['to', 'subject', 'body']
    }
  }
};

/**
 * Mark email as read/unread
 */
export const GMAIL_MARK_READ_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_mark_read',
    description: 'Markiert eine Email als gelesen oder ungelesen.',
    parameters: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Message-ID der Email'
        },
        read: {
          type: 'boolean',
          description: 'true = als gelesen markieren, false = als ungelesen markieren'
        }
      },
      required: ['messageId', 'read']
    }
  }
};

/**
 * Get inbox stats
 */
export const GMAIL_STATS_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_stats',
    description: 'Ruft Statistiken über das Postfach ab (Anzahl ungelesen, wichtig, etc.).',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
};

/**
 * Use email template
 */
export const EMAIL_USE_TEMPLATE_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'email_use_template',
    description: 'Verwendet eine gespeicherte Email-Vorlage und ersetzt Variablen.',
    parameters: {
      type: 'object',
      properties: {
        templateName: {
          type: 'string',
          description: 'Name der Vorlage (z.B. "Follow-up", "Meeting-Anfrage", "Danke")'
        },
        variables: {
          type: 'object',
          description: 'Variablen zum Ersetzen. Beispiel: {"name": "Max", "company": "Firma GmbH", "topic": "Projektbesprechung"}'
        }
      },
      required: ['templateName']
    }
  }
};

/**
 * List available templates
 */
export const EMAIL_LIST_TEMPLATES_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'email_list_templates',
    description: 'Listet alle verfügbaren Email-Vorlagen auf.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter nach Kategorie (optional). Beispiele: "follow-up", "meeting", "intro", "reply"'
        }
      }
    }
  }
};

// ============================================
// BATCH OPERATIONS - Efficient multi-email actions
// ============================================

/**
 * Batch archive emails
 */
export const GMAIL_BATCH_ARCHIVE_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_batch_archive',
    description: 'Archiviert mehrere Emails auf einmal. Effizienter als einzelne Archivierungen. Maximum 50 Emails pro Aufruf.',
    parameters: {
      type: 'object',
      properties: {
        messageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array von Message-IDs zum Archivieren (max. 50)'
        }
      },
      required: ['messageIds']
    }
  }
};

/**
 * Batch delete (trash) emails
 */
export const GMAIL_BATCH_TRASH_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_batch_trash',
    description: 'Verschiebt mehrere Emails auf einmal in den Papierkorb. ACHTUNG: Diese Aktion sollte bestätigt werden!',
    parameters: {
      type: 'object',
      properties: {
        messageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array von Message-IDs zum Löschen (max. 50)'
        }
      },
      required: ['messageIds']
    }
  }
};

/**
 * Batch mark as read/unread
 */
export const GMAIL_BATCH_MARK_READ_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_batch_mark_read',
    description: 'Markiert mehrere Emails auf einmal als gelesen oder ungelesen.',
    parameters: {
      type: 'object',
      properties: {
        messageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array von Message-IDs (max. 50)'
        },
        read: {
          type: 'boolean',
          description: 'true = als gelesen markieren, false = als ungelesen markieren'
        }
      },
      required: ['messageIds', 'read']
    }
  }
};

/**
 * Batch modify labels
 */
export const GMAIL_BATCH_LABEL_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'gmail_batch_label',
    description: 'Ändert Labels für mehrere Emails auf einmal. Kann Labels hinzufügen oder entfernen.',
    parameters: {
      type: 'object',
      properties: {
        messageIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array von Message-IDs (max. 50)'
        },
        addLabels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels hinzufügen (z.B. ["STARRED", "IMPORTANT"])'
        },
        removeLabels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels entfernen (z.B. ["UNREAD", "INBOX"])'
        }
      },
      required: ['messageIds']
    }
  }
};

/**
 * Batch tools for Emmie
 */
export const EMMIE_BATCH_TOOLS: ChatCompletionTool[] = [
  GMAIL_BATCH_ARCHIVE_TOOL,
  GMAIL_BATCH_TRASH_TOOL,
  GMAIL_BATCH_MARK_READ_TOOL,
  GMAIL_BATCH_LABEL_TOOL,
];

/**
 * All Gmail tools for Emmie
 */
export const EMMIE_GMAIL_TOOLS: ChatCompletionTool[] = [
  GMAIL_SEARCH_TOOL,
  GMAIL_READ_TOOL,
  GMAIL_SEND_TOOL,
  GMAIL_REPLY_TOOL,
  GMAIL_GET_THREAD_TOOL,
  GMAIL_ARCHIVE_TOOL,
  GMAIL_LABEL_TOOL,
  GMAIL_TRASH_TOOL,
  GMAIL_DRAFT_TOOL,
  GMAIL_MARK_READ_TOOL,
  GMAIL_STATS_TOOL,
];

/**
 * All basic tools for Emmie (Gmail + Templates + Batch)
 */
export const EMMIE_ALL_TOOLS: ChatCompletionTool[] = [
  ...EMMIE_GMAIL_TOOLS,
  ...EMMIE_BATCH_TOOLS,
  EMAIL_USE_TEMPLATE_TOOL,
  EMAIL_LIST_TEMPLATES_TOOL,
];

// Import AI tools for complete collection
import { EMMIE_AI_TOOLS } from './ai-tools';

/**
 * Complete tool set for Emmie (All tools including AI-powered)
 */
export const EMMIE_COMPLETE_TOOLS: ChatCompletionTool[] = [
  ...EMMIE_ALL_TOOLS,
  ...EMMIE_AI_TOOLS,
];

/**
 * Tool name to display name mapping (German)
 */
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  // Single email operations
  gmail_search: 'Emails durchsuchen',
  gmail_read: 'Email lesen',
  gmail_send: 'Email senden',
  gmail_reply: 'Antwort senden',
  gmail_get_thread: 'Thread laden',
  gmail_archive: 'Archivieren',
  gmail_label: 'Labels ändern',
  gmail_trash: 'In Papierkorb verschieben',
  gmail_draft: 'Entwurf erstellen',
  gmail_mark_read: 'Als gelesen markieren',
  gmail_stats: 'Postfach-Statistiken',
  // Batch operations
  gmail_batch_archive: 'Mehrere archivieren',
  gmail_batch_trash: 'Mehrere löschen',
  gmail_batch_mark_read: 'Mehrere als gelesen markieren',
  gmail_batch_label: 'Mehrere Labels ändern',
  // Templates
  email_use_template: 'Vorlage verwenden',
  email_list_templates: 'Vorlagen auflisten',
  // AI-powered tools
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
export const TOOL_EMOJIS: Record<string, string> = {
  // Single email operations
  gmail_search: '🔍',
  gmail_read: '📧',
  gmail_send: '📤',
  gmail_reply: '↩️',
  gmail_get_thread: '🧵',
  gmail_archive: '📥',
  gmail_label: '🏷️',
  gmail_trash: '🗑️',
  gmail_draft: '📝',
  gmail_mark_read: '👁️',
  gmail_stats: '📊',
  // Batch operations
  gmail_batch_archive: '📦',
  gmail_batch_trash: '🗑️',
  gmail_batch_mark_read: '✅',
  gmail_batch_label: '🏷️',
  // Templates
  email_use_template: '📋',
  email_list_templates: '📑',
  // AI-powered tools
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
 * Get display string for a tool
 */
export function getToolDisplay(toolName: string): string {
  const emoji = TOOL_EMOJIS[toolName] || '🔧';
  const name = TOOL_DISPLAY_NAMES[toolName] || toolName;
  return `${emoji} ${name}`;
}
