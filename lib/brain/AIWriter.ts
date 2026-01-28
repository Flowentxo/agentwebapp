/**
 * AI Writer Module - Role-Based Content Generation
 *
 * Features:
 * - Role-specific prompts (Product Manager, Marketing, Engineer, etc.)
 * - Template library
 * - Thread summarization
 * - Document generation
 * - Tone adjustment
 */

import { modelRouter, GenerationResult, RouterOptions } from './ModelRouter';

// ============================================
// TYPES & INTERFACES
// ============================================

export type WriterRole =
  | 'product-manager'
  | 'marketing'
  | 'engineer'
  | 'sales'
  | 'legal'
  | 'support'
  | 'executive'
  | 'hr'
  | 'general';

export type WriterTemplate =
  | 'prd'
  | 'roadmap'
  | 'spec'
  | 'blog'
  | 'email-campaign'
  | 'social'
  | 'api-doc'
  | 'readme'
  | 'architecture'
  | 'proposal'
  | 'follow-up'
  | 'pitch'
  | 'contract'
  | 'nda'
  | 'policy'
  | 'meeting-notes'
  | 'report'
  | 'faq';

export type WriterTone =
  | 'professional'
  | 'casual'
  | 'formal'
  | 'friendly'
  | 'technical'
  | 'persuasive'
  | 'concise';

export interface WriterConfig {
  role: WriterRole;
  template?: WriterTemplate;
  tone?: WriterTone;
  language?: 'de' | 'en';
  maxLength?: 'short' | 'medium' | 'long';
  includeCallToAction?: boolean;
}

export interface ThreadMessage {
  author: string;
  content: string;
  timestamp: string;
  reactions?: string[];
}

export interface ThreadSummary {
  summary: string;
  decisions: string[];
  actionItems: {
    item: string;
    assignee?: string;
    deadline?: string;
  }[];
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  participants: string[];
  duration: string;
}

export interface GeneratedContent {
  content: string;
  title?: string;
  sections?: { heading: string; content: string }[];
  metadata: {
    role: WriterRole;
    template?: WriterTemplate;
    tone?: WriterTone;
    wordCount: number;
    readingTimeMinutes: number;
  };
  suggestions?: string[];
}

// ============================================
// ROLE PROMPTS
// ============================================

const ROLE_PROMPTS: Record<WriterRole, { systemPrompt: string; traits: string[] }> = {
  'product-manager': {
    systemPrompt: `Du bist ein erfahrener Product Manager, der klare, strukturierte Dokumentation erstellt.

DEIN STIL:
- Fokus auf Nutzerbedürfnisse und Business Value
- Klare Anforderungen mit Akzeptanzkriterien
- Priorisierung nach Impact
- Stakeholder-orientierte Kommunikation

STRUKTUR:
- Problem Statement
- User Stories / Requirements
- Success Metrics
- Timeline / Milestones`,
    traits: ['strukturiert', 'nutzerorientiert', 'priorisierend']
  },
  'marketing': {
    systemPrompt: `Du bist ein kreativer Marketing-Experte, der überzeugende Inhalte erstellt.

DEIN STIL:
- Emotionale Ansprache
- Klare Value Propositions
- Call-to-Action fokussiert
- SEO-optimiert wenn relevant
- Storytelling-Elemente

STRUKTUR:
- Hook / Headline
- Pain Points
- Solution
- Benefits
- Call-to-Action`,
    traits: ['kreativ', 'überzeugend', 'emotional']
  },
  'engineer': {
    systemPrompt: `Du bist ein Senior Software Engineer, der technische Dokumentation erstellt.

DEIN STIL:
- Präzise und technisch akkurat
- Code-Beispiele wo sinnvoll
- Best Practices hervorheben
- Architektur-bewusst

STRUKTUR:
- Overview / Problem
- Technical Approach
- Implementation Details
- Code Examples
- Trade-offs / Considerations`,
    traits: ['technisch', 'präzise', 'detailliert']
  },
  'sales': {
    systemPrompt: `Du bist ein erfahrener Sales Professional, der überzeugende Kommunikation erstellt.

DEIN STIL:
- Relationship-fokussiert
- Value-orientiert
- Einwände antizipieren
- Klare nächste Schritte

STRUKTUR:
- Persönlicher Bezug
- Verständnis zeigen
- Lösung präsentieren
- Konkreter Vorschlag
- Call-to-Action`,
    traits: ['überzeugend', 'beziehungsorientiert', 'lösungsorientiert']
  },
  'legal': {
    systemPrompt: `Du bist ein erfahrener Legal Advisor, der präzise rechtliche Dokumente erstellt.

DEIN STIL:
- Formelle Sprache
- Präzise Definitionen
- Vollständige Klauseln
- Risiko-bewusst

WICHTIG: Weise immer darauf hin, dass dies keine Rechtsberatung darstellt und ein Anwalt konsultiert werden sollte.

STRUKTUR:
- Definitionen
- Hauptklauseln
- Bedingungen
- Haftung / Gewährleistung`,
    traits: ['formal', 'präzise', 'risikobewusst']
  },
  'support': {
    systemPrompt: `Du bist ein freundlicher Customer Support Spezialist, der hilfreiche Antworten erstellt.

DEIN STIL:
- Empathisch und verständnisvoll
- Lösungsorientiert
- Klare Schritt-für-Schritt Anleitungen
- Follow-up anbieten

STRUKTUR:
- Bestätigung des Problems
- Klare Lösung / Schritte
- Alternative Optionen
- Weitere Hilfe anbieten`,
    traits: ['empathisch', 'hilfsbereit', 'klar']
  },
  'executive': {
    systemPrompt: `Du bist ein C-Level Executive, der strategische Kommunikation erstellt.

DEIN STIL:
- Big Picture Perspektive
- Datengetrieben
- Entscheidungsorientiert
- Stakeholder-fokussiert

STRUKTUR:
- Executive Summary
- Key Insights
- Strategic Implications
- Recommendations
- Next Steps`,
    traits: ['strategisch', 'datengetrieben', 'entscheidungsorientiert']
  },
  'hr': {
    systemPrompt: `Du bist ein HR Professional, der mitarbeiterorientierte Kommunikation erstellt.

DEIN STIL:
- Mitfühlend und fair
- Policy-konform
- Inklusiv
- Entwicklungsorientiert

STRUKTUR:
- Kontext / Anlass
- Kernbotschaft
- Auswirkungen / Erwartungen
- Unterstützung / Ressourcen`,
    traits: ['empathisch', 'fair', 'entwicklungsorientiert']
  },
  'general': {
    systemPrompt: `Du bist ein vielseitiger Business Writer, der professionelle Inhalte erstellt.

DEIN STIL:
- Klar und verständlich
- Professionell
- Zielgruppengerecht
- Gut strukturiert`,
    traits: ['professionell', 'klar', 'vielseitig']
  }
};

// ============================================
// TEMPLATE PROMPTS
// ============================================

const TEMPLATE_PROMPTS: Partial<Record<WriterTemplate, string>> = {
  'prd': `Erstelle ein Product Requirements Document (PRD) mit:
- Problem Statement
- Goals & Success Metrics
- User Stories
- Requirements (Must-have, Nice-to-have)
- Out of Scope
- Timeline`,

  'roadmap': `Erstelle eine Produkt-Roadmap mit:
- Vision Statement
- Key Themes / Initiatives
- Quarterly Milestones
- Dependencies
- Success Metrics`,

  'blog': `Erstelle einen Blogbeitrag mit:
- Aufmerksamkeitsstarke Headline
- Einleitender Hook
- Strukturierte Abschnitte
- Praktische Takeaways
- Call-to-Action`,

  'api-doc': `Erstelle API-Dokumentation mit:
- Endpoint Overview
- Authentication
- Request/Response Examples
- Error Codes
- Rate Limits`,

  'meeting-notes': `Erstelle Meeting-Notizen mit:
- Datum, Teilnehmer, Agenda
- Diskussionspunkte
- Entscheidungen
- Action Items mit Verantwortlichen
- Nächste Schritte`,

  'proposal': `Erstelle ein Proposal/Angebot mit:
- Executive Summary
- Problem/Bedarf
- Vorgeschlagene Lösung
- Scope & Deliverables
- Timeline & Pricing
- Next Steps`
};

// ============================================
// AI WRITER SERVICE
// ============================================

export class AIWriterService {
  private static instance: AIWriterService;

  private constructor() {
    console.log('[AIWriter] Initialized with', Object.keys(ROLE_PROMPTS).length, 'roles');
  }

  public static getInstance(): AIWriterService {
    if (!AIWriterService.instance) {
      AIWriterService.instance = new AIWriterService();
    }
    return AIWriterService.instance;
  }

  /**
   * Generate content based on role and input
   */
  public async generate(
    input: string,
    config: WriterConfig
  ): Promise<GeneratedContent> {
    const roleConfig = ROLE_PROMPTS[config.role];
    const templatePrompt = config.template ? TEMPLATE_PROMPTS[config.template] : '';

    // Build system prompt
    let systemPrompt = roleConfig.systemPrompt;

    if (config.tone) {
      systemPrompt += `\n\nTON: Schreibe in einem ${this.getToneDescription(config.tone)} Stil.`;
    }

    if (config.language === 'en') {
      systemPrompt = systemPrompt.replace(/Du bist/g, 'You are')
        .replace(/DEIN STIL/g, 'YOUR STYLE')
        .replace(/STRUKTUR/g, 'STRUCTURE');
    }

    // Build user prompt
    let userPrompt = input;

    if (templatePrompt) {
      userPrompt = `${templatePrompt}\n\nINPUT:\n${input}`;
    }

    if (config.maxLength) {
      const lengthGuide = {
        short: '200-400 Wörter',
        medium: '500-800 Wörter',
        long: '1000-1500 Wörter'
      };
      userPrompt += `\n\nLÄNGE: Ca. ${lengthGuide[config.maxLength]}`;
    }

    if (config.includeCallToAction) {
      userPrompt += '\n\nEnde mit einem klaren Call-to-Action.';
    }

    // Generate content
    const result = await modelRouter.generate(
      systemPrompt,
      userPrompt,
      { preferQuality: config.maxLength === 'long' }
    );

    // Parse sections if structured
    const sections = this.parseSections(result.content);

    // Calculate metrics
    const wordCount = result.content.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    return {
      content: result.content,
      title: sections.length > 0 ? sections[0].heading : undefined,
      sections: sections.length > 1 ? sections : undefined,
      metadata: {
        role: config.role,
        template: config.template,
        tone: config.tone,
        wordCount,
        readingTimeMinutes
      },
      suggestions: this.generateSuggestions(config.role, result.content)
    };
  }

  /**
   * Summarize a thread/conversation
   */
  public async summarizeThread(
    messages: ThreadMessage[],
    options?: {
      maxLength?: 'short' | 'medium' | 'long';
      focusOn?: 'decisions' | 'action-items' | 'key-points' | 'all';
    }
  ): Promise<ThreadSummary> {
    const formattedThread = messages.map(m =>
      `[${m.timestamp}] ${m.author}: ${m.content}${m.reactions?.length ? ` (${m.reactions.join(', ')})` : ''}`
    ).join('\n');

    const focus = options?.focusOn || 'all';
    const focusInstruction = focus !== 'all'
      ? `Fokussiere besonders auf ${focus === 'decisions' ? 'Entscheidungen' : focus === 'action-items' ? 'Action Items' : 'Schlüsselpunkte'}.`
      : '';

    const prompt = `Analysiere diesen Diskussions-Thread und erstelle eine Zusammenfassung:

${formattedThread}

${focusInstruction}

Antworte im JSON-Format:
{
  "summary": "Kurze Zusammenfassung der Diskussion",
  "decisions": ["Entscheidung 1", "Entscheidung 2"],
  "actionItems": [{"item": "Task", "assignee": "Person", "deadline": "optional"}],
  "keyPoints": ["Punkt 1", "Punkt 2"],
  "sentiment": "positive|neutral|negative|mixed"
}`;

    const result = await modelRouter.generate(
      'Du bist ein präziser Kommunikationsanalyst. Extrahiere die wichtigsten Informationen aus Diskussionen.',
      prompt,
      { preferSpeed: true }
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Calculate duration
        const timestamps = messages.map(m => new Date(m.timestamp).getTime());
        const durationMs = Math.max(...timestamps) - Math.min(...timestamps);
        const durationHours = Math.round(durationMs / (1000 * 60 * 60));

        return {
          summary: parsed.summary || '',
          decisions: parsed.decisions || [],
          actionItems: (parsed.actionItems || []).map((item: string | { item: string; assignee?: string; deadline?: string }) => {
            if (typeof item === 'string') {
              return { item };
            }
            return item;
          }),
          keyPoints: parsed.keyPoints || [],
          sentiment: parsed.sentiment || 'neutral',
          participants: [...new Set(messages.map(m => m.author))],
          duration: durationHours > 24
            ? `${Math.round(durationHours / 24)} Tage`
            : `${durationHours} Stunden`
        };
      }
    } catch (error) {
      console.error('[AIWriter] Thread summary parse error:', error);
    }

    // Fallback
    return {
      summary: 'Zusammenfassung konnte nicht erstellt werden.',
      decisions: [],
      actionItems: [],
      keyPoints: [],
      sentiment: 'neutral',
      participants: [...new Set(messages.map(m => m.author))],
      duration: 'unbekannt'
    };
  }

  /**
   * Improve/rewrite existing content
   */
  public async improve(
    content: string,
    instructions: string,
    config?: Partial<WriterConfig>
  ): Promise<GeneratedContent> {
    const role = config?.role || 'general';
    const roleConfig = ROLE_PROMPTS[role];

    const prompt = `ORIGINAL TEXT:
${content}

VERBESSERUNGSANWEISUNGEN:
${instructions}

Schreibe den Text neu und verbessere ihn entsprechend der Anweisungen.`;

    const result = await modelRouter.generate(
      roleConfig.systemPrompt,
      prompt,
      { preferQuality: true }
    );

    const wordCount = result.content.split(/\s+/).length;

    return {
      content: result.content,
      metadata: {
        role,
        tone: config?.tone,
        wordCount,
        readingTimeMinutes: Math.ceil(wordCount / 200)
      }
    };
  }

  /**
   * Generate content variations
   */
  public async generateVariations(
    content: string,
    count: number = 3,
    variationType: 'tone' | 'length' | 'style' = 'tone'
  ): Promise<string[]> {
    const instructions = {
      tone: 'Erstelle Variationen mit unterschiedlichen Tönen (formell, casual, enthusiastisch)',
      length: 'Erstelle Variationen unterschiedlicher Länge (kurz, mittel, ausführlich)',
      style: 'Erstelle Variationen mit unterschiedlichen Stilen (direktiv, fragend, storytelling)'
    };

    const prompt = `ORIGINAL:
${content}

${instructions[variationType]}

Erstelle ${count} Variationen. Nummeriere sie mit 1., 2., 3. etc.`;

    const result = await modelRouter.generate(
      'Du bist ein vielseitiger Content-Experte. Erstelle kreative Variationen.',
      prompt,
      { preferQuality: true }
    );

    // Parse variations
    const variations: string[] = [];
    const lines = result.content.split('\n');
    let currentVariation = '';

    for (const line of lines) {
      if (/^\d+\.\s/.test(line)) {
        if (currentVariation) {
          variations.push(currentVariation.trim());
        }
        currentVariation = line.replace(/^\d+\.\s*/, '');
      } else if (currentVariation) {
        currentVariation += ' ' + line;
      }
    }

    if (currentVariation) {
      variations.push(currentVariation.trim());
    }

    return variations.slice(0, count);
  }

  // ============================================
  // HELPERS
  // ============================================

  private getToneDescription(tone: WriterTone): string {
    const descriptions: Record<WriterTone, string> = {
      professional: 'professionellen und geschäftsmäßigen',
      casual: 'lockeren und entspannten',
      formal: 'formellen und offiziellen',
      friendly: 'freundlichen und warmen',
      technical: 'technischen und präzisen',
      persuasive: 'überzeugenden und motivierenden',
      concise: 'knappen und auf den Punkt gebrachten'
    };
    return descriptions[tone] || 'professionellen';
  }

  private parseSections(content: string): { heading: string; content: string }[] {
    const sections: { heading: string; content: string }[] = [];
    const lines = content.split('\n');
    let currentHeading = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('**') && line.endsWith('**')) {
        if (currentHeading || currentContent.length > 0) {
          sections.push({
            heading: currentHeading || 'Introduction',
            content: currentContent.join('\n').trim()
          });
        }
        currentHeading = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentHeading || currentContent.length > 0) {
      sections.push({
        heading: currentHeading || 'Content',
        content: currentContent.join('\n').trim()
      });
    }

    return sections;
  }

  private generateSuggestions(role: WriterRole, content: string): string[] {
    const suggestions: string[] = [];

    // Role-specific suggestions
    if (role === 'marketing' && !content.includes('?')) {
      suggestions.push('Füge eine rhetorische Frage hinzu, um Engagement zu erhöhen');
    }

    if (role === 'sales' && !content.toLowerCase().includes('nächst')) {
      suggestions.push('Ergänze einen klaren nächsten Schritt');
    }

    if (content.split(/\s+/).length > 500) {
      suggestions.push('Erwäge eine kürzere Version für bessere Lesbarkeit');
    }

    return suggestions;
  }

  /**
   * Get available roles
   */
  public getRoles(): { id: WriterRole; name: string; traits: string[] }[] {
    return Object.entries(ROLE_PROMPTS).map(([id, config]) => ({
      id: id as WriterRole,
      name: this.getRoleName(id as WriterRole),
      traits: config.traits
    }));
  }

  /**
   * Get available templates for a role
   */
  public getTemplates(role: WriterRole): WriterTemplate[] {
    const roleTemplates: Record<WriterRole, WriterTemplate[]> = {
      'product-manager': ['prd', 'roadmap', 'spec', 'meeting-notes'],
      'marketing': ['blog', 'email-campaign', 'social', 'pitch'],
      'engineer': ['api-doc', 'readme', 'architecture', 'spec'],
      'sales': ['proposal', 'follow-up', 'pitch'],
      'legal': ['contract', 'nda', 'policy'],
      'support': ['faq'],
      'executive': ['report', 'proposal'],
      'hr': ['policy'],
      'general': ['meeting-notes', 'report', 'email-campaign']
    };

    return roleTemplates[role] || [];
  }

  private getRoleName(role: WriterRole): string {
    const names: Record<WriterRole, string> = {
      'product-manager': 'Product Manager',
      'marketing': 'Marketing',
      'engineer': 'Engineer',
      'sales': 'Sales',
      'legal': 'Legal',
      'support': 'Support',
      'executive': 'Executive',
      'hr': 'HR',
      'general': 'General'
    };
    return names[role];
  }
}

export const aiWriter = AIWriterService.getInstance();
