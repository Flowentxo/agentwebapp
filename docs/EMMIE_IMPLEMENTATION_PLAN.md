# Emmie Email Agent - Vollständiger Implementierungsplan

## Übersicht

**Ziel:** Transformation von Emmie von einem passiven Email-Kontext-Reader zu einem vollwertigen agentic Email-Manager mit OpenAI Function Calling.

**Zeitrahmen:** 5 Phasen
**Priorität:** Hoch

---

## Ist-Zustand Analyse

### Aktuelle Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    AKTUELLER ZUSTAND                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Message ──► Chat API ──► getAgentSystemPrompt()       │
│                                      │                      │
│                                      ▼                      │
│                          getEmailContextForEmmie()          │
│                                      │                      │
│                                      ▼                      │
│                          GmailReaderService                 │
│                          (nur lesen, max 10 Emails)         │
│                                      │                      │
│                                      ▼                      │
│                     Email-Kontext in System-Prompt          │
│                                      │                      │
│                                      ▼                      │
│                          OpenAI Response                    │
│                          (nur Text, keine Aktionen)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Probleme

| Problem | Impact | Lösung |
|---------|--------|--------|
| Keine Tool-Calls | Emmie kann keine Aktionen ausführen | OpenAI Function Calling |
| Kein Email-Senden aus Chat | User muss manuell senden | gmail_send Tool |
| Keine Suche | Nur letzte 10 Emails sichtbar | gmail_search Tool |
| Keine Thread-Awareness | Antworten ohne Kontext | gmail_get_thread Tool |
| Keine Email-Aktionen | Kein Archivieren/Löschen/Labels | Action Tools |
| Falsche EmmieAgent.ts | Enthält Analytics statt Email | Komplettes Refactoring |

---

## Soll-Zustand Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    ZIEL-ARCHITEKTUR                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User: "Suche Emails von Max und antworte auf die letzte"   │
│                          │                                  │
│                          ▼                                  │
│                   Chat API (Emmie)                          │
│                          │                                  │
│                          ▼                                  │
│            OpenAI + EMMIE_TOOLS (Function Calling)          │
│                          │                                  │
│              ┌───────────┴───────────┐                      │
│              ▼                       ▼                      │
│    Tool Call: gmail_search    (AI entscheidet)              │
│              │                                              │
│              ▼                                              │
│    GmailUnifiedService.search()                             │
│              │                                              │
│              ▼                                              │
│    Tool Result: 5 Emails gefunden                           │
│              │                                              │
│              ▼                                              │
│    Tool Call: gmail_read (letzte Email)                     │
│              │                                              │
│              ▼                                              │
│    Tool Call: gmail_reply (Antwort senden)                  │
│              │                                              │
│              ▼                                              │
│    Finale Response: "Ich habe auf Max's Email geantwortet"  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Gmail Tools Infrastructure

**Dauer:** ~4-6 Stunden
**Abhängigkeiten:** Keine

### Task 1.1: Gmail Tool Definitions

**Neue Datei:** `lib/agents/emmie/tools/gmail-tools.ts`

```typescript
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const GMAIL_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'gmail_search',
      description: 'Sucht Emails im Gmail-Postfach. Unterstützt Gmail-Suchoperatoren.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Gmail-Suchquery (z.B. "from:max@example.com", "subject:Rechnung", "is:unread", "newer_than:7d")'
          },
          maxResults: {
            type: 'number',
            description: 'Maximale Anzahl Ergebnisse (1-50, Standard: 10)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_read',
      description: 'Liest eine spezifische Email mit vollem Inhalt',
      parameters: {
        type: 'object',
        properties: {
          messageId: {
            type: 'string',
            description: 'Die Gmail Message-ID'
          },
          includeAttachments: {
            type: 'boolean',
            description: 'Attachment-Infos inkludieren (Standard: false)'
          }
        },
        required: ['messageId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_send',
      description: 'Sendet eine neue Email',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Empfänger Email-Adresse' },
          subject: { type: 'string', description: 'Email-Betreff' },
          body: { type: 'string', description: 'Email-Inhalt (HTML erlaubt)' },
          cc: { type: 'string', description: 'CC-Empfänger (optional)' },
          bcc: { type: 'string', description: 'BCC-Empfänger (optional)' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_reply',
      description: 'Antwortet auf eine Email im selben Thread',
      parameters: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Original Message-ID' },
          body: { type: 'string', description: 'Antwort-Inhalt' },
          replyAll: { type: 'boolean', description: 'An alle antworten (Standard: false)' }
        },
        required: ['messageId', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_get_thread',
      description: 'Lädt einen kompletten Email-Thread',
      parameters: {
        type: 'object',
        properties: {
          threadId: { type: 'string', description: 'Thread-ID' }
        },
        required: ['threadId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_archive',
      description: 'Archiviert eine Email (entfernt INBOX-Label)',
      parameters: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message-ID' }
        },
        required: ['messageId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_label',
      description: 'Ändert Labels einer Email',
      parameters: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message-ID' },
          addLabels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Labels hinzufügen'
          },
          removeLabels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Labels entfernen'
          }
        },
        required: ['messageId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_trash',
      description: 'Verschiebt eine Email in den Papierkorb',
      parameters: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message-ID' }
        },
        required: ['messageId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_draft',
      description: 'Erstellt einen Email-Entwurf',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Empfänger' },
          subject: { type: 'string', description: 'Betreff' },
          body: { type: 'string', description: 'Inhalt' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gmail_mark_read',
      description: 'Markiert Email als gelesen/ungelesen',
      parameters: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message-ID' },
          read: { type: 'boolean', description: 'true=gelesen, false=ungelesen' }
        },
        required: ['messageId', 'read']
      }
    }
  }
];
```

### Task 1.2: GmailUnifiedService erstellen

**Neue Datei:** `server/services/GmailUnifiedService.ts`

Kombiniert und erweitert `GmailReaderService` + `GmailOAuthService`:

| Methode | Beschreibung | Gmail API |
|---------|--------------|-----------|
| `searchEmails()` | Emails suchen | `users.messages.list` |
| `getEmail()` | Einzelne Email lesen | `users.messages.get` |
| `getThread()` | Thread laden | `users.threads.get` |
| `sendEmail()` | Email senden | `users.messages.send` |
| `replyToEmail()` | Antwort senden | `users.messages.send` (mit threadId) |
| `archiveEmail()` | Archivieren | `users.messages.modify` |
| `trashEmail()` | Löschen | `users.messages.trash` |
| `modifyLabels()` | Labels ändern | `users.messages.modify` |
| `createDraft()` | Entwurf erstellen | `users.drafts.create` |
| `markAsRead()` | Gelesen markieren | `users.messages.modify` |

### Task 1.3: Tool Executor erstellen

**Neue Datei:** `lib/agents/emmie/tools/tool-executor.ts`

```typescript
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string; // Für UI-Anzeige
}

export async function executeGmailTool(
  toolName: string,
  args: Record<string, any>,
  userId: string
): Promise<ToolResult>;
```

### Dateien Phase 1

| Aktion | Pfad |
|--------|------|
| NEU | `lib/agents/emmie/tools/gmail-tools.ts` |
| NEU | `lib/agents/emmie/tools/tool-executor.ts` |
| NEU | `lib/agents/emmie/tools/index.ts` |
| NEU | `server/services/GmailUnifiedService.ts` |
| MODIFY | `server/services/GmailReaderService.ts` (deprecated markieren) |

### Testkriterien Phase 1

- [ ] `GmailUnifiedService.searchEmails()` findet Emails
- [ ] `GmailUnifiedService.sendEmail()` sendet erfolgreich
- [ ] `GmailUnifiedService.archiveEmail()` archiviert korrekt
- [ ] `GmailUnifiedService.replyToEmail()` erstellt Reply im Thread
- [ ] Tool-Executor führt jeden Tool-Typ aus
- [ ] Error-Handling für ungültige Token

---

## Phase 2: OpenAI Function Calling Integration

**Dauer:** ~4-6 Stunden
**Abhängigkeiten:** Phase 1

### Task 2.1: OpenAI Service erweitern

**Datei modifizieren:** `lib/ai/openai-service.ts`

Neue Funktion hinzufügen:

```typescript
export interface ToolCallEvent {
  type: 'tool_call_start' | 'tool_call_result' | 'text_chunk' | 'done';
  tool?: string;
  args?: any;
  result?: any;
  chunk?: string;
}

export async function* streamWithTools(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: ChatMessage[],
  tools: ChatCompletionTool[],
  toolExecutor: (name: string, args: any) => Promise<ToolResult>,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    maxToolCalls?: number; // Limit für Tool-Calls pro Request
  }
): AsyncGenerator<ToolCallEvent, void, unknown>
```

**Logik:**
1. Erste OpenAI Request mit Tools
2. Wenn `finish_reason === 'tool_calls'`:
   - Tool-Call Events yielden
   - Tools ausführen
   - Results zurück an OpenAI senden
   - Repeat bis `finish_reason === 'stop'`
3. Text-Chunks streamen

### Task 2.2: Emmie System Prompt aktualisieren

**Datei modifizieren:** `lib/agents/prompts.ts`

```typescript
emmie: `Du bist Emmie, ein professioneller Email-Manager mit Zugriff auf das Gmail-Postfach des Nutzers.

DEINE FÄHIGKEITEN:
Du hast Zugriff auf folgende Gmail-Funktionen:
- gmail_search: Emails suchen (z.B. "from:max@example.com", "is:unread")
- gmail_read: Email vollständig lesen
- gmail_send: Neue Email senden
- gmail_reply: Auf Email antworten
- gmail_get_thread: Kompletten Email-Thread laden
- gmail_archive: Email archivieren
- gmail_label: Labels hinzufügen/entfernen
- gmail_trash: Email löschen
- gmail_draft: Entwurf erstellen
- gmail_mark_read: Als gelesen/ungelesen markieren

WICHTIGE REGELN:
1. BEVOR du eine Aktion ausführst, erkläre kurz was du tun wirst
2. Nach Aktionen wie Senden, Archivieren, Löschen: Bestätige den Erfolg
3. Bei Suchen: Fasse die Ergebnisse zusammen (Anzahl, wichtigste Absender)
4. Beim Antworten: Zeige die Antwort-Vorschau bevor du sendest
5. Bei kritischen Aktionen (Löschen, Senden an viele): Frage nach Bestätigung

DEINE PERSÖNLICHKEIT:
- Professionell und effizient
- Proaktiv (schlage sinnvolle nächste Schritte vor)
- Sorgfältig bei sensiblen Aktionen
- Kommuniziere auf Deutsch

EMAIL-KONTEXT:
Die letzten Emails des Nutzers werden dir automatisch bereitgestellt.
Referenziere Emails immer mit Absender und Betreff für Klarheit.`
```

### Task 2.3: Chat Route für Emmie anpassen

**Datei modifizieren:** `app/api/agents/[id]/chat/route.ts`

```typescript
// Spezielle Behandlung für Emmie
if (agentId === 'emmie' && isGmailConnected) {
  const { GMAIL_TOOLS } = await import('@/lib/agents/emmie/tools');
  const { executeGmailTool } = await import('@/lib/agents/emmie/tools/tool-executor');

  // Tool-enabled streaming
  const stream = streamWithTools(
    systemPrompt,
    content,
    conversationHistory,
    GMAIL_TOOLS,
    async (name, args) => executeGmailTool(name, args, userId),
    { model: selectedModel, maxToolCalls: 5 }
  );

  // Custom SSE format für Tool-Events
  for await (const event of stream) {
    if (event.type === 'tool_call_start') {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'tool', status: 'executing', tool: event.tool })}\n\n`
      ));
    } else if (event.type === 'tool_call_result') {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'tool', status: 'complete', tool: event.tool, summary: event.result?.summary })}\n\n`
      ));
    } else if (event.type === 'text_chunk') {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ chunk: event.chunk })}\n\n`
      ));
    }
  }
}
```

### Dateien Phase 2

| Aktion | Pfad |
|--------|------|
| MODIFY | `lib/ai/openai-service.ts` |
| MODIFY | `lib/agents/prompts.ts` |
| MODIFY | `app/api/agents/[id]/chat/route.ts` |

### Testkriterien Phase 2

- [ ] "Zeige meine ungelesenen Emails" → `gmail_search` wird aufgerufen
- [ ] "Lies die erste Email" → `gmail_read` wird aufgerufen
- [ ] "Antworte mit: Danke für die Info" → `gmail_reply` wird aufgerufen
- [ ] Multi-Step: "Suche Emails von Max und fasse zusammen" funktioniert
- [ ] Tool-Execution Events werden gestreamt
- [ ] Conversation History enthält Tool-Calls

---

## Phase 3: Frontend Integration

**Dauer:** ~3-4 Stunden
**Abhängigkeiten:** Phase 2

### Task 3.1: Chat Interface für Tool-Events erweitern

**Datei modifizieren:** `components/agents/chat/ChatInterface.tsx`

Neue States:
```typescript
const [activeToolCall, setActiveToolCall] = useState<{
  tool: string;
  status: 'executing' | 'complete' | 'error';
  summary?: string;
} | null>(null);
```

Neue UI-Komponente:
```tsx
{activeToolCall && (
  <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
    {activeToolCall.status === 'executing' ? (
      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
    ) : (
      <CheckCircle className="h-4 w-4 text-green-400" />
    )}
    <span className="text-sm text-purple-300">
      {getToolDisplayName(activeToolCall.tool)}
      {activeToolCall.summary && `: ${activeToolCall.summary}`}
    </span>
  </div>
)}
```

### Task 3.2: Tool-Namen Mapping

**Neue Datei:** `lib/agents/emmie/tool-display.ts`

```typescript
export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  gmail_search: '🔍 Emails durchsuchen',
  gmail_read: '📧 Email lesen',
  gmail_send: '📤 Email senden',
  gmail_reply: '↩️ Antwort senden',
  gmail_get_thread: '🧵 Thread laden',
  gmail_archive: '📥 Archivieren',
  gmail_label: '🏷️ Labels ändern',
  gmail_trash: '🗑️ In Papierkorb verschieben',
  gmail_draft: '📝 Entwurf erstellen',
  gmail_mark_read: '👁️ Als gelesen markieren',
};

export const TOOL_ICONS: Record<string, LucideIcon> = { ... };
```

### Task 3.3: Email-Action Bestätigungs-Dialog

**Neue Datei:** `components/agents/emmie/ActionConfirmDialog.tsx`

Für kritische Aktionen (Löschen, Senden):
```tsx
<Dialog open={showConfirm}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Email senden?</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div><strong>An:</strong> {emailDetails.to}</div>
      <div><strong>Betreff:</strong> {emailDetails.subject}</div>
      <div className="max-h-40 overflow-auto">{emailDetails.body}</div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
      <Button onClick={onConfirm}>Senden</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Task 3.4: Email-Kontext Sidebar für Emmie

**Datei modifizieren:** `components/agents/chat/ContextSidebar.tsx`

Emmie-spezifische Section:
```tsx
{agentId === 'emmie' && (
  <div className="space-y-4">
    <h3 className="font-medium">📧 Email-Übersicht</h3>

    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="p-2 bg-blue-500/10 rounded">
        <div className="text-2xl font-bold">{unreadCount}</div>
        <div className="text-xs text-muted-foreground">Ungelesen</div>
      </div>
      <div className="p-2 bg-yellow-500/10 rounded">
        <div className="text-2xl font-bold">{starredCount}</div>
        <div className="text-xs text-muted-foreground">Markiert</div>
      </div>
    </div>

    <div>
      <h4 className="text-sm font-medium mb-2">Letzte Aktionen</h4>
      <ul className="text-xs space-y-1">
        {recentActions.map(action => (
          <li key={action.id} className="flex items-center gap-1">
            {TOOL_ICONS[action.type]}
            <span>{action.summary}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
)}
```

### Dateien Phase 3

| Aktion | Pfad |
|--------|------|
| MODIFY | `components/agents/chat/ChatInterface.tsx` |
| MODIFY | `components/agents/chat/ContextSidebar.tsx` |
| NEU | `components/agents/emmie/ActionConfirmDialog.tsx` |
| NEU | `components/agents/emmie/EmailPreview.tsx` |
| NEU | `lib/agents/emmie/tool-display.ts` |

### Testkriterien Phase 3

- [ ] Tool-Execution wird visuell angezeigt (Spinner)
- [ ] Tool-Completion zeigt Summary
- [ ] Kritische Aktionen zeigen Bestätigungs-Dialog
- [ ] Email-Vorschau wird korrekt gerendert
- [ ] Context Sidebar zeigt Email-Stats

---

## Phase 4: Email Templates System

**Dauer:** ~4-5 Stunden
**Abhängigkeiten:** Phase 3

### Task 4.1: Datenbank Schema

**Neue Datei:** `lib/db/schema-email-templates.ts`

```typescript
import { pgTable, uuid, varchar, text, jsonb, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  category: varchar('category', { length: 100 }), // 'follow-up', 'meeting', 'intro', 'reply'
  variables: jsonb('variables').$type<string[]>().default([]), // ['{{name}}', '{{company}}']
  tone: varchar('tone', { length: 50 }), // 'formal', 'casual', 'friendly'
  language: varchar('language', { length: 10 }).default('de'),
  isPublic: boolean('is_public').default(false),
  usageCount: integer('usage_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const emailActionsLog = pgTable('email_actions_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'send', 'reply', 'archive', etc.
  messageId: varchar('message_id', { length: 255 }),
  threadId: varchar('thread_id', { length: 255 }),
  recipient: varchar('recipient', { length: 255 }),
  subject: varchar('subject', { length: 500 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Task 4.2: Migration erstellen

**Neue Datei:** `lib/db/migrations/0040_email_templates_system.sql`

```sql
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(100),
  variables JSONB DEFAULT '[]',
  tone VARCHAR(50),
  language VARCHAR(10) DEFAULT 'de',
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  message_id VARCHAR(255),
  thread_id VARCHAR(255),
  recipient VARCHAR(255),
  subject VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_templates_user ON email_templates(user_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_actions_user ON email_actions_log(user_id);
CREATE INDEX idx_email_actions_created ON email_actions_log(created_at DESC);
```

### Task 4.3: Email Template Service

**Neue Datei:** `server/services/EmailTemplateService.ts`

```typescript
export class EmailTemplateService {
  async createTemplate(userId: string, data: CreateTemplateInput): Promise<EmailTemplate>;
  async getTemplates(userId: string, category?: string): Promise<EmailTemplate[]>;
  async getTemplate(userId: string, templateId: string): Promise<EmailTemplate | null>;
  async updateTemplate(userId: string, templateId: string, data: UpdateTemplateInput): Promise<EmailTemplate>;
  async deleteTemplate(userId: string, templateId: string): Promise<void>;
  async useTemplate(templateId: string, variables: Record<string, string>): Promise<{ subject: string; body: string }>;
  async suggestTemplates(userId: string, context: string): Promise<EmailTemplate[]>;
  async getDefaultTemplates(): Promise<EmailTemplate[]>;
}
```

### Task 4.4: Template Tool hinzufügen

In `lib/agents/emmie/tools/gmail-tools.ts` ergänzen:

```typescript
{
  type: 'function',
  function: {
    name: 'email_use_template',
    description: 'Verwendet eine Email-Vorlage und ersetzt Variablen',
    parameters: {
      type: 'object',
      properties: {
        templateName: {
          type: 'string',
          description: 'Name der Vorlage (z.B. "Follow-up", "Meeting-Anfrage")'
        },
        variables: {
          type: 'object',
          description: 'Variablen zum Ersetzen (z.B. {"name": "Max", "company": "Firma GmbH"})'
        }
      },
      required: ['templateName']
    }
  }
},
{
  type: 'function',
  function: {
    name: 'email_list_templates',
    description: 'Listet verfügbare Email-Vorlagen auf',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter nach Kategorie (optional)'
        }
      }
    }
  }
}
```

### Task 4.5: Template API Endpoints

**Neue Datei:** `app/api/agents/emmie/templates/route.ts`

```typescript
// GET: Liste aller Templates
// POST: Neues Template erstellen
```

**Neue Datei:** `app/api/agents/emmie/templates/[id]/route.ts`

```typescript
// GET: Template Details
// PUT: Template aktualisieren
// DELETE: Template löschen
```

### Task 4.6: Template UI

**Neue Datei:** `app/(app)/agents/emmie/templates/page.tsx`

Features:
- Template-Liste mit Suche/Filter
- Template-Editor mit Variablen-Highlighting
- Template-Preview
- Import/Export

### Task 4.7: Default Templates erstellen

```typescript
const DEFAULT_TEMPLATES = [
  {
    name: 'Follow-up',
    category: 'follow-up',
    subject: 'Follow-up: {{topic}}',
    body: `Hallo {{name}},

ich wollte kurz nachfragen, wie der Stand bezüglich {{topic}} ist.

Gibt es bereits Neuigkeiten oder kann ich Ihnen mit weiteren Informationen behilflich sein?

Mit freundlichen Grüßen`,
    variables: ['name', 'topic'],
    tone: 'formal'
  },
  {
    name: 'Meeting-Anfrage',
    category: 'meeting',
    subject: 'Terminanfrage: {{topic}}',
    body: `Hallo {{name}},

ich würde gerne einen Termin mit Ihnen vereinbaren, um {{topic}} zu besprechen.

Wären Sie am {{date}} um {{time}} verfügbar?

Falls nicht, lassen Sie mich gerne wissen, welche Zeiten Ihnen besser passen würden.

Mit freundlichen Grüßen`,
    variables: ['name', 'topic', 'date', 'time'],
    tone: 'formal'
  },
  // ... weitere Templates
];
```

### Dateien Phase 4

| Aktion | Pfad |
|--------|------|
| NEU | `lib/db/schema-email-templates.ts` |
| NEU | `lib/db/migrations/0040_email_templates_system.sql` |
| NEU | `server/services/EmailTemplateService.ts` |
| MODIFY | `lib/agents/emmie/tools/gmail-tools.ts` |
| MODIFY | `lib/agents/emmie/tools/tool-executor.ts` |
| NEU | `app/api/agents/emmie/templates/route.ts` |
| NEU | `app/api/agents/emmie/templates/[id]/route.ts` |
| NEU | `app/(app)/agents/emmie/templates/page.tsx` |
| NEU | `components/agents/emmie/TemplateEditor.tsx` |
| NEU | `components/agents/emmie/TemplateList.tsx` |

### Testkriterien Phase 4

- [ ] Templates können erstellt/bearbeitet/gelöscht werden
- [ ] "Verwende Follow-up Template für Max" funktioniert
- [ ] Variablen werden korrekt ersetzt
- [ ] Template-Vorschläge basierend auf Kontext
- [ ] Usage-Count wird inkrementiert
- [ ] Default Templates werden geladen

---

## Phase 5: Thread-Awareness & Multi-Step Reasoning

**Dauer:** ~4-5 Stunden
**Abhängigkeiten:** Phase 4

### Task 5.1: Thread-Kontext erweitern

**Datei modifizieren:** `server/services/GmailUnifiedService.ts`

```typescript
async getThreadWithContext(userId: string, threadId: string): Promise<{
  thread: EmailThread;
  summary: string;
  participants: string[];
  latestMessage: Email;
  suggestedReplies: string[];
}>;
```

### Task 5.2: Context Accumulation

**Neue Datei:** `lib/agents/emmie/context-manager.ts`

```typescript
export interface EmmieContext {
  currentThread?: EmailThread;
  lastSearchResults?: Email[];
  lastReadEmail?: Email;
  recentActions: EmailAction[];
  suggestedNextSteps: string[];
}

export class EmmieContextManager {
  private context: EmmieContext = { recentActions: [], suggestedNextSteps: [] };

  updateFromToolResult(toolName: string, result: any): void;
  getContextSummary(): string;
  getSuggestedActions(): string[];
  clear(): void;
}
```

### Task 5.3: Proaktive Vorschläge

In Emmie's System Prompt:

```typescript
// Nach jeder Antwort soll Emmie mögliche nächste Aktionen vorschlagen
PROAKTIVE VORSCHLÄGE:
Am Ende jeder Antwort, schlage 1-3 mögliche nächste Aktionen vor, z.B.:
- "Soll ich auf diese Email antworten?"
- "Möchtest du diese Email archivieren?"
- "Soll ich ähnliche Emails suchen?"
```

### Task 5.4: Action Logging

Alle Emmie-Aktionen loggen für Audit und Analytics:

**Datei modifizieren:** `lib/agents/emmie/tools/tool-executor.ts`

```typescript
// Nach jedem erfolgreichen Tool-Call:
await emailActionsLog.create({
  userId,
  action: toolName,
  messageId: result.messageId,
  threadId: result.threadId,
  metadata: { args, resultSummary: result.summary }
});
```

### Task 5.5: Reasoning Chain Visualization

**Neue Datei:** `components/agents/emmie/ReasoningChain.tsx`

Zeigt die Schritte an, die Emmie durchgeführt hat:

```tsx
<div className="space-y-2">
  <h4 className="text-sm font-medium">Durchgeführte Schritte:</h4>
  {steps.map((step, i) => (
    <div key={i} className="flex items-center gap-2 text-sm">
      <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
        {i + 1}
      </span>
      <span>{step.description}</span>
      {step.status === 'complete' && <CheckCircle className="h-4 w-4 text-green-400" />}
    </div>
  ))}
</div>
```

### Dateien Phase 5

| Aktion | Pfad |
|--------|------|
| MODIFY | `server/services/GmailUnifiedService.ts` |
| NEU | `lib/agents/emmie/context-manager.ts` |
| MODIFY | `lib/agents/emmie/tools/tool-executor.ts` |
| MODIFY | `lib/agents/prompts.ts` |
| NEU | `components/agents/emmie/ReasoningChain.tsx` |
| NEU | `app/api/agents/emmie/actions/log/route.ts` |

### Testkriterien Phase 5

- [ ] "Suche Emails von Max, fasse die letzte zusammen, und antworte" - 3 Tool-Calls
- [ ] Thread-Kontext bleibt zwischen Messages erhalten
- [ ] Proaktive Vorschläge erscheinen
- [ ] Action Log zeigt alle Aktionen
- [ ] Reasoning Chain wird visualisiert

---

## Zusammenfassung

### Neue Dateien (gesamt)

| Phase | Neue Dateien |
|-------|--------------|
| 1 | 4 Dateien |
| 2 | 0 Dateien (nur Modifikationen) |
| 3 | 4 Dateien |
| 4 | 8 Dateien |
| 5 | 3 Dateien |
| **Total** | **19 neue Dateien** |

### Modifizierte Dateien (gesamt)

| Datei | Phasen |
|-------|--------|
| `lib/ai/openai-service.ts` | 2 |
| `lib/agents/prompts.ts` | 2, 5 |
| `app/api/agents/[id]/chat/route.ts` | 2 |
| `components/agents/chat/ChatInterface.tsx` | 3 |
| `components/agents/chat/ContextSidebar.tsx` | 3 |
| `server/services/GmailUnifiedService.ts` | 1, 5 |
| `lib/agents/emmie/tools/gmail-tools.ts` | 4 |
| `lib/agents/emmie/tools/tool-executor.ts` | 4, 5 |

### Abhängigkeiten-Graph

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
  │                        │           │
  │                        │           ▼
  │                        └────► Template UI
  │
  └──────────────────────────────► GmailUnifiedService
```

### Risiken

| Risiko | Mitigation |
|--------|------------|
| Gmail API Rate Limits | Caching, Request Batching |
| Token-Expiration während Tool-Execution | Auto-Refresh in GmailUnifiedService |
| Lange Tool-Chains | Max 5 Tool-Calls pro Request |
| Sensitive Data Exposure | Keine Tokens/Passwörter in Logs |

---

## Nächste Schritte

1. **Phase 1 starten** mit `GmailUnifiedService.ts`
2. Nach jeder Phase: Manuelle Tests + Unit Tests
3. Dokumentation aktualisieren
4. User-Feedback einholen nach Phase 3

---

*Erstellt: 2025-12-21*
*Version: 1.0*
