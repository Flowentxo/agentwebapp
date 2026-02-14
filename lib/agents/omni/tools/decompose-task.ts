/**
 * Decompose Task Tool
 *
 * Uses AI to decompose a complex task into sub-tasks
 * and assign each to the most appropriate agent.
 */

import OpenAI from 'openai';

export interface DecomposeTaskInput {
  task: string;
  context?: string;
  max_subtasks?: number;
}

export interface SubTask {
  id: number;
  description: string;
  agent_id: string;
  agent_name: string;
  priority: 'high' | 'medium' | 'low';
  depends_on: number[];
}

export interface DecomposeTaskResult {
  original_task: string;
  subtasks: SubTask[];
  execution_order: string;
  formatted_output: string;
}

export const DECOMPOSE_TASK_TOOL = {
  name: 'decompose_task',
  description: 'Zerlege eine komplexe Aufgabe in Sub-Tasks und weise jedem den passenden Agenten zu. Nutze dies fuer multi-disziplinaere Aufgaben die mehrere Agenten erfordern.',
  input_schema: {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Die zu zerlegende komplexe Aufgabe' },
      context: { type: 'string', description: 'Optionaler Kontext' },
      max_subtasks: { type: 'number', description: 'Max Anzahl Sub-Tasks (default: 5)' },
    },
    required: ['task'],
  },
};

export async function decomposeTask(input: DecomposeTaskInput): Promise<DecomposeTaskResult> {
  const { task, context, max_subtasks = 5 } = input;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const response = await openai.chat.completions.create({
      model,
      ...(model.includes('gpt-5') ? {} : { temperature: 0.3 }),
      ...(model.includes('gpt-5') || model.includes('gpt-4o')
        ? { max_completion_tokens: 1500 }
        : { max_tokens: 1500 }),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du bist ein Task-Decomposer. Zerlege komplexe Aufgaben in Sub-Tasks und weise sie Agenten zu.

VERFUEGBARE AGENTEN:
- dexter: Finanzen, Datenanalyse, ROI, Forecasting, P&L, Stripe-Daten
- kai: Code schreiben, debuggen, reviewen, Sandbox-Execution, Regex-Test
- lex: Vertraege, Compliance, Risikobewertung, Rechtsrecherche, NDA/AGB
- nova: Web-Recherche, Scraping, Trend-Analyse, Quellen-Bewertung
- buddy: Budget-Pruefung, Kostenschaetzung, Ausgaben-Tracking, Tagesplanung
- emmie: E-Mail Management, Gmail-Suche, E-Mail-Entwuerfe, Kalender
- cassie: Kunden-Support, Ticket-Erstellung, Knowledge-Base, Eskalation
- vera: Sicherheit, Passwort-Audit, URL-Scanning, DSGVO-Reports
- ari: Automatisierung, Workflow-Management, System-Health-Checks
- aura: Marketing, Social-Media-Posts, Content-Kalender, Wettbewerbsanalyse
- vince: Video-Produktion, Skript-Erstellung, Storyboard-Planung
- milo: Motion-Design, CSS-Animationen, SVG-Grafiken
- echo: Audio, Transkription, Text-to-Speech
- finn: Finanzstrategie, Portfolio-Risikoanalyse, Kreditvergleich

Antworte NUR als JSON:
{
  "subtasks": [
    {
      "id": 1,
      "description": "<Was der Agent tun soll>",
      "agent_id": "<agent_id>",
      "agent_name": "<Agent Name>",
      "priority": "high|medium|low",
      "depends_on": []
    }
  ],
  "execution_order": "<Erklaerung der Ausfuehrungsreihenfolge>"
}

Maximal ${max_subtasks} Sub-Tasks. Identifiziere Abhaengigkeiten zwischen Tasks.`,
        },
        {
          role: 'user',
          content: `Zerlege diese Aufgabe:${context ? `\n\nKontext: ${context}` : ''}\n\n${task}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const subtasks: SubTask[] = (parsed.subtasks || []).map((st: any, idx: number) => ({
      id: st.id || idx + 1,
      description: st.description || '',
      agent_id: st.agent_id || 'nova',
      agent_name: st.agent_name || st.agent_id || 'Nova',
      priority: st.priority || 'medium',
      depends_on: st.depends_on || [],
    }));

    const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };

    const formatted = [
      `📋 **Task-Zerlegung** (${subtasks.length} Sub-Tasks)`,
      '',
      ...subtasks.map(st => {
        const emoji = priorityEmoji[st.priority] || '⚪';
        const deps = st.depends_on.length > 0
          ? ` (nach Task ${st.depends_on.join(', ')})`
          : '';
        return `${emoji} **${st.id}.** [${st.agent_name}] ${st.description}${deps}`;
      }),
      '',
      `**Ausfuehrung:** ${parsed.execution_order || 'Sequentiell'}`,
    ].join('\n');

    return {
      original_task: task,
      subtasks,
      execution_order: parsed.execution_order || 'Sequentiell',
      formatted_output: formatted,
    };
  } catch (error: any) {
    return {
      original_task: task,
      subtasks: [],
      execution_order: '',
      formatted_output: `❌ Task-Zerlegung fehlgeschlagen: ${error.message}`,
    };
  }
}
