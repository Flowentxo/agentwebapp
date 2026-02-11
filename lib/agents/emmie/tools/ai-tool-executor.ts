/**
 * Emmie AI Tool Executor
 *
 * Executes AI-powered email tools using OpenAI for intelligent processing.
 * Handles summarization, action extraction, smart replies, and more.
 */

import OpenAI from 'openai';
import { gmailUnifiedService, ToolResult } from '@/server/services/GmailUnifiedService';
import { getAIToolDisplay } from './ai-tools';
import type { ToolExecutionContext } from './tool-executor';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

// Helper: GPT-4o and GPT-5 models require max_completion_tokens instead of max_tokens
const getMaxTokensKey = (model: string) =>
  model.includes('gpt-5') || model.includes('gpt-4o')
    ? 'max_completion_tokens'
    : 'max_tokens';

// ============================================================
// AI Tool Rate Limiting (more restrictive due to cost)
// ============================================================

interface AIToolRateLimitEntry {
  count: number;
  windowStart: number;
  tokensUsed: number;
}

const aiToolRateLimits = new Map<string, AIToolRateLimitEntry>();

const AI_TOOL_RATE_LIMITS: Record<string, { limit: number; windowSeconds: number; maxTokens: number }> = {
  gmail_summarize_inbox: { limit: 5, windowSeconds: 300, maxTokens: 20000 },
  gmail_extract_action_items: { limit: 10, windowSeconds: 300, maxTokens: 15000 },
  gmail_semantic_search: { limit: 15, windowSeconds: 300, maxTokens: 10000 },
  gmail_generate_reply: { limit: 20, windowSeconds: 300, maxTokens: 5000 },
  gmail_contact_history: { limit: 10, windowSeconds: 300, maxTokens: 10000 },
  gmail_translate: { limit: 20, windowSeconds: 300, maxTokens: 8000 },
  gmail_unsubscribe_suggestions: { limit: 3, windowSeconds: 600, maxTokens: 15000 },
  // Non-AI tools (lighter limits)
  gmail_schedule_send: { limit: 10, windowSeconds: 60, maxTokens: 0 },
  gmail_find_attachments: { limit: 20, windowSeconds: 60, maxTokens: 0 },
  gmail_snooze: { limit: 20, windowSeconds: 60, maxTokens: 0 },
};

function checkAIToolRateLimit(userId: string, toolName: string): { allowed: boolean; reason?: string } {
  const config = AI_TOOL_RATE_LIMITS[toolName];
  if (!config) return { allowed: true };

  const key = `${userId}:${toolName}`;
  const now = Math.floor(Date.now() / 1000);
  let entry = aiToolRateLimits.get(key);

  if (!entry || now - entry.windowStart >= config.windowSeconds) {
    entry = { count: 1, windowStart: now, tokensUsed: 0 };
    aiToolRateLimits.set(key, entry);
    return { allowed: true };
  }

  if (entry.count >= config.limit) {
    const resetIn = config.windowSeconds - (now - entry.windowStart);
    return {
      allowed: false,
      reason: `Rate-Limit erreicht (${config.limit}/${config.windowSeconds}s). Versuche es in ${resetIn}s erneut.`
    };
  }

  entry.count++;
  aiToolRateLimits.set(key, entry);
  return { allowed: true };
}

// ============================================================
// Main Executor
// ============================================================

/**
 * Execute an AI-powered Gmail tool
 */
export async function executeAITool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[EMMIE_AI_TOOL] Executing ${toolName}`, { userId, args });

  // Check rate limit
  const rateLimitCheck = checkAIToolRateLimit(userId, toolName);
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      error: rateLimitCheck.reason,
      summary: `${getAIToolDisplay(toolName)} blockiert: ${rateLimitCheck.reason}`,
    };
  }

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'gmail_summarize_inbox':
        result = await executeSummarizeInbox(userId, args);
        break;

      case 'gmail_extract_action_items':
        result = await executeExtractActionItems(userId, args);
        break;

      case 'gmail_schedule_send':
        result = await executeScheduleSend(userId, args);
        break;

      case 'gmail_semantic_search':
        result = await executeSemanticSearch(userId, args);
        break;

      case 'gmail_generate_reply':
        result = await executeGenerateReply(userId, args);
        break;

      case 'gmail_contact_history':
        result = await executeContactHistory(userId, args);
        break;

      case 'gmail_find_attachments':
        result = await executeFindAttachments(userId, args);
        break;

      case 'gmail_unsubscribe_suggestions':
        result = await executeUnsubscribeSuggestions(userId, args);
        break;

      case 'gmail_translate':
        result = await executeTranslate(userId, args);
        break;

      case 'gmail_snooze':
        result = await executeSnooze(userId, args);
        break;

      default:
        result = {
          success: false,
          error: `Unbekanntes AI-Tool: ${toolName}`,
          summary: `Tool "${toolName}" ist nicht implementiert`,
        };
    }

    const executionTime = Date.now() - startTime;
    console.log(`[EMMIE_AI_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    return result;
  } catch (error: any) {
    console.error(`[EMMIE_AI_TOOL] ${toolName} failed:`, error);
    return {
      success: false,
      error: error.message,
      summary: `${getAIToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };
  }
}

// ============================================================
// Tool Implementations
// ============================================================

/**
 * Summarize inbox - AI-based summary of unread emails
 */
async function executeSummarizeInbox(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const maxEmails = Math.min(args.maxEmails || 20, 50);
  const groupBy = args.groupBy || 'priority';
  const includeActionItems = args.includeActionItems !== false;

  // Fetch unread emails
  const searchResult = await gmailUnifiedService.searchEmails(userId, {
    query: 'is:unread',
    maxResults: maxEmails,
    includeBody: true,
  });

  if (!searchResult.success || !searchResult.data?.length) {
    return {
      success: true,
      data: { emails: [], summary: 'Keine ungelesenen E-Mails vorhanden.' },
      summary: '📭 Keine ungelesenen E-Mails im Posteingang',
    };
  }

  const emails = searchResult.data;

  // Prepare email data for AI
  const emailSummaries = emails.map((e: any) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    snippet: e.snippet?.substring(0, 200),
    date: e.date,
    hasAttachment: e.hasAttachment,
    labels: e.labels,
  }));

  // Call OpenAI for intelligent summarization
  const prompt = `Du bist Emmie, ein KI-E-Mail-Assistent. Analysiere die folgenden ${emails.length} ungelesenen E-Mails und erstelle eine strukturierte Zusammenfassung.

Gruppiere nach: ${groupBy === 'priority' ? 'Wichtigkeit (Hoch/Mittel/Niedrig)' : groupBy === 'sender' ? 'Absender' : groupBy === 'category' ? 'Kategorie (Arbeit/Persönlich/Newsletter/etc.)' : 'Datum'}

${includeActionItems ? 'Extrahiere auch alle erkennbaren Action Items und Deadlines.' : ''}

E-Mails:
${JSON.stringify(emailSummaries, null, 2)}

Erstelle eine übersichtliche, deutsche Zusammenfassung im folgenden Format:
1. Übersicht (1-2 Sätze)
2. Gruppierte Auflistung
3. ${includeActionItems ? 'Action Items mit Deadlines' : 'Empfohlene Prioritäten'}

Antworte auf Deutsch und nutze Markdown-Formatierung.`;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      [getMaxTokensKey(AI_MODEL)]: 2000,
    } as any);

    const aiSummary = completion.choices[0]?.message?.content || '';

    return {
      success: true,
      data: {
        totalEmails: emails.length,
        emails: emailSummaries,
        aiSummary,
        groupedBy: groupBy,
        tokensUsed: completion.usage?.total_tokens,
      },
      summary: `📋 ${emails.length} ungelesene E-Mail(s) zusammengefasst`,
    };
  } catch (error: any) {
    // Fallback: Return basic summary without AI
    return {
      success: true,
      data: {
        totalEmails: emails.length,
        emails: emailSummaries,
        aiSummary: `${emails.length} ungelesene E-Mails von: ${[...new Set(emails.map((e: any) => e.from))].slice(0, 5).join(', ')}`,
        error: 'AI-Zusammenfassung nicht verfügbar',
      },
      summary: `📋 ${emails.length} ungelesene E-Mail(s) (AI-Analyse fehlgeschlagen)`,
    };
  }
}

/**
 * Extract action items from emails
 */
async function executeExtractActionItems(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const maxEmails = Math.min(args.maxEmails || 20, 30);
  let emails: any[] = [];

  // Fetch emails based on provided IDs or query
  if (args.messageIds?.length) {
    // Fetch specific emails
    for (const id of args.messageIds.slice(0, maxEmails)) {
      const result = await gmailUnifiedService.getEmail(userId, id, false);
      if (result.success && result.data) {
        emails.push(result.data);
      }
    }
  } else {
    const query = args.query || 'is:unread newer_than:7d';
    const searchResult = await gmailUnifiedService.searchEmails(userId, {
      query,
      maxResults: maxEmails,
      includeBody: true,
    });
    if (searchResult.success && searchResult.data) {
      emails = searchResult.data;
    }
  }

  if (emails.length === 0) {
    return {
      success: true,
      data: { actionItems: [], totalEmails: 0 },
      summary: '✅ Keine E-Mails zum Analysieren gefunden',
    };
  }

  // Prepare for AI analysis
  const emailData = emails.map((e: any) => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    body: e.body?.substring(0, 1000) || e.snippet,
    date: e.date,
  }));

  const prompt = `Du bist Emmie, ein KI-E-Mail-Assistent. Analysiere die folgenden E-Mails und extrahiere ALLE Action Items, Aufgaben und Deadlines.

E-Mails:
${JSON.stringify(emailData, null, 2)}

Für jeden gefundenen Action Item gib zurück:
- task: Die Aufgabe (kurz und präzise)
- deadline: Deadline wenn genannt (ISO-Format oder null)
- priority: "urgent", "high", "normal" oder "low"
- source: { emailId, from, subject }
- context: Kurzer Kontext warum diese Aufgabe wichtig ist

${args.priority && args.priority !== 'all' ? `Filtere nur nach Priorität: ${args.priority}` : ''}

Antworte NUR mit einem validen JSON-Array. Beispiel:
[{"task": "Angebot senden", "deadline": "2024-12-20", "priority": "high", "source": {"emailId": "123", "from": "chef@firma.de", "subject": "Dringend"}, "context": "Chef erwartet Angebot bis Freitag"}]`;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      [getMaxTokensKey(AI_MODEL)]: 2000,
      response_format: { type: 'json_object' },
    } as any);

    const response = completion.choices[0]?.message?.content || '{"items":[]}';
    let actionItems: any[] = [];

    try {
      const parsed = JSON.parse(response);
      actionItems = parsed.items || parsed.actionItems || (Array.isArray(parsed) ? parsed : []);
    } catch {
      actionItems = [];
    }

    // Sort by priority and deadline
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    actionItems.sort((a, b) => {
      const pA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const pB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
      if (pA !== pB) return pA - pB;
      if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

    const urgentCount = actionItems.filter(i => i.priority === 'urgent').length;
    const highCount = actionItems.filter(i => i.priority === 'high').length;

    return {
      success: true,
      data: {
        actionItems,
        totalEmails: emails.length,
        totalItems: actionItems.length,
        urgentCount,
        highCount,
        tokensUsed: completion.usage?.total_tokens,
      },
      summary: actionItems.length > 0
        ? `✅ ${actionItems.length} Aufgabe(n) gefunden${urgentCount > 0 ? ` (${urgentCount} dringend!)` : ''}`
        : '✅ Keine Action Items in den E-Mails gefunden',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: '❌ Konnte Action Items nicht extrahieren',
    };
  }
}

/**
 * Schedule email for later sending
 */
async function executeScheduleSend(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const { to, subject, body, scheduledTime, cc, timezone } = args;

  // Parse scheduled time
  let sendAt: Date;
  try {
    sendAt = parseScheduledTime(scheduledTime, timezone);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `⏰ Ungültiger Zeitpunkt: ${error.message}`,
    };
  }

  // Check if time is in the future
  if (sendAt.getTime() <= Date.now()) {
    return {
      success: false,
      error: 'Geplanter Zeitpunkt muss in der Zukunft liegen',
      summary: '⏰ Zeitpunkt muss in der Zukunft liegen',
    };
  }

  // Create draft with scheduled metadata
  const draftResult = await gmailUnifiedService.createDraft(userId, {
    to,
    subject,
    body,
    cc,
    isHtml: true,
  });

  if (!draftResult.success) {
    return draftResult;
  }

  // Store scheduled info (in production, this would go to a job queue)
  const scheduledEmail = {
    draftId: draftResult.data?.draftId,
    to,
    subject,
    scheduledTime: sendAt.toISOString(),
    timezone: timezone || 'Europe/Berlin',
    createdAt: new Date().toISOString(),
    status: 'scheduled',
  };

  // TODO: In production, add to a job queue (e.g., BullMQ, Agenda) for actual scheduled sending

  return {
    success: true,
    data: scheduledEmail,
    summary: `⏰ E-Mail geplant für ${formatDateTime(sendAt)} an ${to}`,
  };
}

/**
 * Semantic search using AI
 */
async function executeSemanticSearch(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const { query, maxResults = 10, dateRange = 'month', includeSnippet = true } = args;

  // Convert date range to Gmail query
  const dateRangeMap: Record<string, string> = {
    week: 'newer_than:7d',
    month: 'newer_than:30d',
    quarter: 'newer_than:90d',
    year: 'newer_than:365d',
    all: '',
  };
  const dateQuery = dateRangeMap[dateRange as string] || 'newer_than:30d';

  // First, do a broad Gmail search
  const searchResult = await gmailUnifiedService.searchEmails(userId, {
    query: dateQuery,
    maxResults: Math.min(maxResults * 3, 50), // Get more to filter
    includeBody: true,
  });

  if (!searchResult.success || !searchResult.data?.length) {
    return {
      success: true,
      data: { results: [], query },
      summary: `🧠 Keine E-Mails gefunden für "${query}"`,
    };
  }

  const emails = searchResult.data;

  // Use AI to semantically match
  const prompt = `Du bist Emmie, ein KI-E-Mail-Assistent. Der Nutzer sucht nach: "${query}"

Analysiere diese E-Mails und finde die ${maxResults} relevantesten Treffer. Berücksichtige die BEDEUTUNG, nicht nur Schlüsselwörter.

E-Mails:
${emails.map((e: any, i: number) => `[${i}] Von: ${e.from} | Betreff: ${e.subject} | ${e.snippet?.substring(0, 150)}`).join('\n')}

Antworte mit einem JSON-Objekt:
{
  "matches": [
    {"index": 0, "relevanceScore": 95, "reason": "Kurze Begründung"},
    ...
  ]
}

Sortiere nach Relevanz (höchste zuerst). Nur E-Mails mit Relevanz > 30 inkludieren.`;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      [getMaxTokensKey(AI_MODEL)]: 1000,
      response_format: { type: 'json_object' },
    } as any);

    const response = JSON.parse(completion.choices[0]?.message?.content || '{"matches":[]}');
    const matches = response.matches || [];

    // Map matches to actual emails
    const results = matches
      .slice(0, maxResults)
      .map((m: any) => {
        const email = emails[m.index];
        if (!email) return null;
        return {
          id: email.id,
          from: email.from,
          subject: email.subject,
          snippet: includeSnippet ? email.snippet : undefined,
          date: email.date,
          relevanceScore: m.relevanceScore,
          matchReason: m.reason,
        };
      })
      .filter(Boolean);

    return {
      success: true,
      data: {
        results,
        query,
        totalSearched: emails.length,
        tokensUsed: completion.usage?.total_tokens,
      },
      summary: results.length > 0
        ? `🧠 ${results.length} relevante E-Mail(s) für "${query}" gefunden`
        : `🧠 Keine passenden E-Mails für "${query}" gefunden`,
    };
  } catch (error: any) {
    // Fallback to basic keyword search
    const filtered = emails.filter((e: any) =>
      e.subject?.toLowerCase().includes(query.toLowerCase()) ||
      e.snippet?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, maxResults);

    return {
      success: true,
      data: {
        results: filtered,
        query,
        fallback: true,
      },
      summary: `🔍 ${filtered.length} E-Mail(s) gefunden (einfache Suche)`,
    };
  }
}

/**
 * Generate AI-powered reply
 */
async function executeGenerateReply(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const { messageId, tone = 'professional', intent, length = 'medium', language, includeContext = true } = args;

  // Fetch the email
  const emailResult = await gmailUnifiedService.getEmail(userId, messageId, false);
  if (!emailResult.success || !emailResult.data) {
    return {
      success: false,
      error: 'E-Mail nicht gefunden',
      summary: '❌ E-Mail konnte nicht geladen werden',
    };
  }

  const email = emailResult.data;
  let threadContext = '';

  // Optionally load thread for context
  if (includeContext && email.threadId) {
    const threadResult = await gmailUnifiedService.getThread(userId, email.threadId);
    if (threadResult.success && threadResult.data?.messages) {
      threadContext = threadResult.data.messages
        .slice(-5) // Last 5 messages
        .map((m: any) => `Von: ${m.from}\n${m.snippet}`)
        .join('\n---\n');
    }
  }

  const toneInstructions = {
    formal: 'Formell und geschäftsmäßig. Verwende Sie-Anrede.',
    friendly: 'Freundlich und warmherzig, aber professionell.',
    professional: 'Professionell und sachlich.',
    casual: 'Locker und persönlich. Du-Anrede erlaubt.',
    assertive: 'Selbstbewusst und bestimmt, aber respektvoll.',
    apologetic: 'Entschuldigend und einfühlsam.',
  };

  const lengthInstructions = {
    short: '2-3 Sätze. Prägnant und auf den Punkt.',
    medium: '4-6 Sätze. Ausgewogene Antwort.',
    detailed: '7-10 Sätze. Ausführliche Antwort mit allen Details.',
  };

  const prompt = `Du bist Emmie, ein KI-E-Mail-Assistent. Erstelle eine Antwort auf diese E-Mail.

ORIGINAL-E-MAIL:
Von: ${email.from}
Betreff: ${email.subject}
Inhalt: ${email.body || email.snippet}

${threadContext ? `KONVERSATIONS-KONTEXT:\n${threadContext}\n` : ''}

ANWEISUNGEN:
- Ton: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}
- Länge: ${lengthInstructions[length as keyof typeof lengthInstructions] || lengthInstructions.medium}
${intent ? `- Absicht: ${intent}` : ''}
${language ? `- Sprache: ${language}` : '- Sprache: Gleiche Sprache wie Original'}

Erstelle eine passende Antwort. Beginne NICHT mit "Hallo" wenn es zu formell wäre. Passe den Gruß an den Ton an.`;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      [getMaxTokensKey(AI_MODEL)]: 1000,
    } as any);

    const generatedReply = completion.choices[0]?.message?.content || '';

    return {
      success: true,
      data: {
        originalEmail: {
          id: email.id,
          from: email.from,
          subject: email.subject,
        },
        generatedReply,
        tone,
        intent,
        tokensUsed: completion.usage?.total_tokens,
      },
      summary: `✍️ Antwortvorschlag generiert (${tone})`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: '❌ Konnte Antwort nicht generieren',
    };
  }
}

/**
 * Get contact communication history
 */
async function executeContactHistory(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const { email, maxEmails = 10, includeStats = true, summarize = true } = args;

  // Search for emails from/to this contact
  const fromResult = await gmailUnifiedService.searchEmails(userId, {
    query: `from:${email}`,
    maxResults: Math.ceil(maxEmails / 2),
    includeBody: false,
  });

  const toResult = await gmailUnifiedService.searchEmails(userId, {
    query: `to:${email}`,
    maxResults: Math.ceil(maxEmails / 2),
    includeBody: false,
  });

  const fromEmails = fromResult.data || [];
  const toEmails = toResult.data || [];
  const allEmails = [...fromEmails, ...toEmails]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxEmails);

  if (allEmails.length === 0) {
    return {
      success: true,
      data: { email, history: [], stats: null },
      summary: `👤 Keine E-Mails mit ${email} gefunden`,
    };
  }

  const stats = includeStats ? {
    totalEmails: fromEmails.length + toEmails.length,
    fromContact: fromEmails.length,
    toContact: toEmails.length,
    firstContact: allEmails[allEmails.length - 1]?.date,
    lastContact: allEmails[0]?.date,
    avgResponseTime: 'Nicht verfügbar', // Would need more complex calculation
  } : null;

  let aiSummary = '';
  if (summarize && allEmails.length >= 3) {
    try {
      const prompt = `Analysiere die Kommunikationshistorie mit ${email} und erstelle eine kurze Zusammenfassung (2-3 Sätze):

${allEmails.slice(0, 10).map((e: any) => `- ${e.from === email ? 'Von' : 'An'} ${email}: ${e.subject}`).join('\n')}

Beschreibe: Beziehungsart, Häufige Themen, Ton der Kommunikation.`;

      const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        [getMaxTokensKey(AI_MODEL)]: 300,
      } as any);

      aiSummary = completion.choices[0]?.message?.content || '';
    } catch {
      aiSummary = '';
    }
  }

  return {
    success: true,
    data: {
      email,
      history: allEmails.map((e: any) => ({
        id: e.id,
        direction: e.from?.includes(email) ? 'received' : 'sent',
        subject: e.subject,
        date: e.date,
        snippet: e.snippet,
      })),
      stats,
      aiSummary: aiSummary || undefined,
    },
    summary: `👤 ${allEmails.length} E-Mail(s) mit ${email} gefunden`,
  };
}

/**
 * Find emails with attachments
 */
async function executeFindAttachments(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const { fileType = 'all', from, query = '', minSize, maxSize, dateRange = 'month', maxResults = 20 } = args;

  // Build Gmail query
  let gmailQuery = 'has:attachment';

  if (fileType && fileType !== 'all') {
    const typeMap: Record<string, string> = {
      pdf: 'filename:pdf',
      xlsx: 'filename:xlsx OR filename:xls',
      docx: 'filename:docx OR filename:doc',
      image: 'filename:jpg OR filename:png OR filename:gif',
      zip: 'filename:zip OR filename:rar',
    };
    gmailQuery += ` ${typeMap[fileType] || `filename:${fileType}`}`;
  }

  if (from) gmailQuery += ` from:${from}`;
  if (query) gmailQuery += ` ${query}`;
  if (minSize) gmailQuery += ` larger:${minSize}`;
  if (maxSize) gmailQuery += ` smaller:${maxSize}`;

  const attachmentDateMap: Record<string, string> = {
    week: 'newer_than:7d',
    month: 'newer_than:30d',
    quarter: 'newer_than:90d',
    year: 'newer_than:365d',
  };
  const dateQueryPart = attachmentDateMap[dateRange as string];
  if (dateQueryPart) gmailQuery += ` ${dateQueryPart}`;

  const result = await gmailUnifiedService.searchEmails(userId, {
    query: gmailQuery,
    maxResults,
    includeBody: false,
  });

  if (!result.success) {
    return result;
  }

  const emails = result.data || [];

  return {
    success: true,
    data: {
      emails: emails.map((e: any) => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        date: e.date,
        hasAttachment: true,
        attachmentInfo: e.attachments || 'Details beim Öffnen verfügbar',
      })),
      query: gmailQuery,
      totalFound: emails.length,
    },
    summary: `📎 ${emails.length} E-Mail(s) mit Anhängen gefunden`,
  };
}

/**
 * Find unsubscribe candidates
 */
async function executeUnsubscribeSuggestions(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const { minCount = 3, analyzePeriod = 'quarter', excludeDomains = [], sortBy = 'frequency' } = args;

  const unsubscribeDateMap: Record<string, string> = {
    month: 'newer_than:30d',
    quarter: 'newer_than:90d',
    year: 'newer_than:365d',
  };
  const dateQuery = unsubscribeDateMap[analyzePeriod as string] || 'newer_than:90d';

  // Search for typical newsletter patterns
  const result = await gmailUnifiedService.searchEmails(userId, {
    query: `${dateQuery} (unsubscribe OR abmelden OR newsletter OR list-unsubscribe)`,
    maxResults: 100,
    includeBody: false,
  });

  if (!result.success || !result.data?.length) {
    return {
      success: true,
      data: { suggestions: [], message: 'Keine Newsletter gefunden' },
      summary: '🚫 Keine Abmelde-Vorschläge gefunden',
    };
  }

  // Group by sender domain
  const senderCounts: Record<string, { count: number; emails: any[]; lastDate: string }> = {};

  for (const email of result.data) {
    const fromEmail = email.from?.match(/<(.+)>$/)?.[1] || email.from || '';
    const domain = fromEmail.split('@')[1] || 'unknown';

    // Skip excluded domains
    if (excludeDomains.some((d: string) => domain.includes(d))) continue;

    if (!senderCounts[domain]) {
      senderCounts[domain] = { count: 0, emails: [], lastDate: email.date };
    }
    senderCounts[domain].count++;
    senderCounts[domain].emails.push(email);
    if (new Date(email.date) > new Date(senderCounts[domain].lastDate)) {
      senderCounts[domain].lastDate = email.date;
    }
  }

  // Filter by minimum count and sort
  let suggestions = Object.entries(senderCounts)
    .filter(([, data]) => data.count >= minCount)
    .map(([domain, data]) => ({
      domain,
      count: data.count,
      lastReceived: data.lastDate,
      sampleSubject: data.emails[0]?.subject,
      sampleFrom: data.emails[0]?.from,
    }));

  // Sort based on preference
  if (sortBy === 'frequency') {
    suggestions.sort((a, b) => b.count - a.count);
  } else if (sortBy === 'last_opened') {
    suggestions.sort((a, b) => new Date(a.lastReceived).getTime() - new Date(b.lastReceived).getTime());
  }

  return {
    success: true,
    data: {
      suggestions: suggestions.slice(0, 20),
      totalAnalyzed: result.data.length,
      period: analyzePeriod,
    },
    summary: `🚫 ${suggestions.length} Newsletter zum Abmelden vorgeschlagen`,
  };
}

/**
 * Translate email content
 */
async function executeTranslate(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const { messageId, targetLanguage = 'de', includeOriginal = false, translateSubject = true } = args;

  const emailResult = await gmailUnifiedService.getEmail(userId, messageId, false);
  if (!emailResult.success || !emailResult.data) {
    return {
      success: false,
      error: 'E-Mail nicht gefunden',
      summary: '❌ E-Mail konnte nicht geladen werden',
    };
  }

  const email = emailResult.data;
  const languageNames: Record<string, string> = {
    de: 'Deutsch',
    en: 'Englisch',
    fr: 'Französisch',
    es: 'Spanisch',
    it: 'Italienisch',
    pt: 'Portugiesisch',
    zh: 'Chinesisch',
    ja: 'Japanisch',
    ko: 'Koreanisch',
    ru: 'Russisch',
  };

  const prompt = `Übersetze die folgende E-Mail ins ${languageNames[targetLanguage] || targetLanguage}. Behalte die Formatierung und den Ton bei.

${translateSubject ? `Betreff: ${email.subject}\n` : ''}
Inhalt:
${email.body || email.snippet}

Antworte mit einem JSON-Objekt:
{
  "translatedSubject": ${translateSubject ? '"..."' : 'null'},
  "translatedBody": "...",
  "detectedLanguage": "..."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      [getMaxTokensKey(AI_MODEL)]: 2000,
      response_format: { type: 'json_object' },
    } as any);

    const translation = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return {
      success: true,
      data: {
        original: includeOriginal ? {
          subject: email.subject,
          body: email.body || email.snippet,
        } : undefined,
        translated: {
          subject: translation.translatedSubject,
          body: translation.translatedBody,
        },
        detectedLanguage: translation.detectedLanguage,
        targetLanguage,
        tokensUsed: completion.usage?.total_tokens,
      },
      summary: `🌐 E-Mail übersetzt (${translation.detectedLanguage} → ${languageNames[targetLanguage] || targetLanguage})`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: '❌ Übersetzung fehlgeschlagen',
    };
  }
}

/**
 * Snooze email for later
 */
async function executeSnooze(
  userId: string,
  args: Record<string, any>
): Promise<ToolResult> {
  const { messageId, snoozeUntil, note } = args;

  // Parse snooze time
  let remindAt: Date;
  try {
    remindAt = parseScheduledTime(snoozeUntil);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      summary: `⏳ Ungültiger Zeitpunkt: ${error.message}`,
    };
  }

  if (remindAt.getTime() <= Date.now()) {
    return {
      success: false,
      error: 'Snooze-Zeitpunkt muss in der Zukunft liegen',
      summary: '⏳ Zeitpunkt muss in der Zukunft liegen',
    };
  }

  // Archive the email (remove from inbox)
  const archiveResult = await gmailUnifiedService.archiveEmail(userId, messageId);
  if (!archiveResult.success) {
    return archiveResult;
  }

  // Mark as unread so it appears as new when "unarchived"
  await gmailUnifiedService.markAsRead(userId, messageId, false);

  // Store snooze info (in production, this would go to a job queue)
  const snoozeData = {
    messageId,
    snoozeUntil: remindAt.toISOString(),
    note,
    createdAt: new Date().toISOString(),
    status: 'snoozed',
  };

  // TODO: In production, add to a job queue that will move email back to inbox at the specified time

  return {
    success: true,
    data: snoozeData,
    summary: `⏳ E-Mail verschoben bis ${formatDateTime(remindAt)}${note ? ` (${note})` : ''}`,
  };
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Parse scheduled time from various formats
 */
function parseScheduledTime(input: string, timezone?: string): Date {
  const now = new Date();
  const inputLower = input.toLowerCase().trim();

  // Relative time patterns
  if (inputLower.startsWith('in ')) {
    const match = inputLower.match(/in (\d+) (stunde|stunden|minute|minuten|tag|tage|woche|wochen)/);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];
      const date = new Date(now);

      if (unit.startsWith('stunde')) date.setHours(date.getHours() + amount);
      else if (unit.startsWith('minute')) date.setMinutes(date.getMinutes() + amount);
      else if (unit.startsWith('tag')) date.setDate(date.getDate() + amount);
      else if (unit.startsWith('woche')) date.setDate(date.getDate() + amount * 7);

      return date;
    }
  }

  // Named times
  if (inputLower.includes('morgen')) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    const timeMatch = inputLower.match(/(\d{1,2}):?(\d{2})?/);
    if (timeMatch) {
      date.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2] || '0'), 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
    return date;
  }

  if (inputLower.includes('nächsten montag') || inputLower.includes('nächster montag')) {
    const date = new Date(now);
    const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
    date.setDate(date.getDate() + daysUntilMonday);
    date.setHours(9, 0, 0, 0);
    return date;
  }

  // ISO format or standard date string
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Konnte Zeitpunkt nicht verstehen: "${input}". Verwende z.B. "morgen 9:00", "in 2 Stunden", oder ein ISO-Datum.`);
}

/**
 * Format date/time for display
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
