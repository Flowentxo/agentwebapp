/**
 * REVOLUTIONARY COMMAND PARSER
 *
 * Natural language → Agent actions
 * Think Siri, but for your AI agent army.
 */

import { AgentPersonality, REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';

export type CommandIntent =
  | 'analyze'
  | 'create'
  | 'send'
  | 'review'
  | 'monitor'
  | 'research'
  | 'visualize'
  | 'calculate'
  | 'write'
  | 'code'
  | 'legal'
  | 'support'
  | 'collaborate'
  | 'unknown';

export interface ParsedCommand {
  intent: CommandIntent;
  originalText: string;
  agents: AgentPersonality[];
  parameters: Record<string, any>;
  confidence: number;
  suggestions?: string[];
}

export interface CommandPattern {
  pattern: RegExp;
  intent: CommandIntent;
  agents: string[];
  extractParams?: (match: RegExpMatchArray) => Record<string, any>;
}

/**
 * Command patterns for intent detection
 */
const COMMAND_PATTERNS: CommandPattern[] = [
  // Data Analysis
  {
    pattern: /analyze|analysis|data|metrics|report|statistics|trends?/i,
    intent: 'analyze',
    agents: ['dexter', 'vera'],
  },
  {
    pattern: /visualize|chart|graph|dashboard|show me/i,
    intent: 'visualize',
    agents: ['vera', 'dexter'],
  },

  // Communication
  {
    pattern: /send|email|message|notify|communicate/i,
    intent: 'send',
    agents: ['emmie', 'cassie'],
  },
  {
    pattern: /write|draft|compose|create (?:email|message)/i,
    intent: 'write',
    agents: ['emmie'],
  },

  // Customer Support
  {
    pattern: /support|customer|help|ticket|inquiry|issue|complaint/i,
    intent: 'support',
    agents: ['cassie'],
  },

  // Code & Technical
  {
    pattern: /code|debug|review|programming|build|develop|fix|bug/i,
    intent: 'code',
    agents: ['kai'],
  },
  {
    pattern: /monitor|watch|track|alert|system/i,
    intent: 'monitor',
    agents: ['omni'],
  },

  // Legal
  {
    pattern: /legal|contract|compliance|regulation|law|policy/i,
    intent: 'legal',
    agents: ['lex'],
  },

  // Financial
  {
    pattern: /finance|budget|cost|revenue|profit|expense|calculate|financial/i,
    intent: 'calculate',
    agents: ['finn'],
  },

  // Research & Knowledge
  {
    pattern: /research|find|search|learn|knowledge|investigate/i,
    intent: 'research',
    agents: ['echo', 'dexter'],
  },

  // Strategy & Planning
  {
    pattern: /strategy|plan|roadmap|vision|future|innovate/i,
    intent: 'create',
    agents: ['aura', 'nova'],
  },

  // Collaboration
  {
    pattern: /collaborate|team|together|multiple|all agents/i,
    intent: 'collaborate',
    agents: ['aura', 'dexter', 'cassie'],
  },
];

/**
 * Parse natural language command into structured intent
 */
export function parseCommand(text: string): ParsedCommand {
  const normalizedText = text.trim().toLowerCase();

  if (!normalizedText) {
    return {
      intent: 'unknown',
      originalText: text,
      agents: [],
      parameters: {},
      confidence: 0,
      suggestions: [
        'Try: "Analyze sales data"',
        'Try: "Send email to customer"',
        'Try: "Review code for bugs"',
      ],
    };
  }

  // Find matching pattern
  let bestMatch: CommandPattern | null = null;
  let matchConfidence = 0;

  for (const pattern of COMMAND_PATTERNS) {
    const match = normalizedText.match(pattern.pattern);
    if (match) {
      // Calculate confidence based on match length vs total text
      const confidence = match[0].length / normalizedText.length;
      if (confidence > matchConfidence) {
        matchConfidence = confidence;
        bestMatch = pattern;
      }
    }
  }

  if (!bestMatch) {
    return {
      intent: 'unknown',
      originalText: text,
      agents: [],
      parameters: {},
      confidence: 0,
      suggestions: generateSuggestions(normalizedText),
    };
  }

  // Get agent personalities
  const agents = bestMatch.agents
    .map(id => REVOLUTIONARY_PERSONAS[id as keyof typeof REVOLUTIONARY_PERSONAS])
    .filter(Boolean);

  // Extract parameters (if pattern has extraction function)
  const parameters = bestMatch.extractParams
    ? bestMatch.extractParams(normalizedText.match(bestMatch.pattern)!)
    : extractGenericParameters(normalizedText);

  return {
    intent: bestMatch.intent,
    originalText: text,
    agents,
    parameters,
    confidence: Math.min(matchConfidence * 1.5, 1), // Boost confidence slightly
  };
}

/**
 * Extract generic parameters from text
 */
function extractGenericParameters(text: string): Record<string, any> {
  const params: Record<string, any> = {};

  // Extract time periods
  const timeMatch = text.match(/(?:last|past|previous)\s+(\d+)\s+(day|week|month|year)s?/i);
  if (timeMatch) {
    params.timePeriod = {
      amount: parseInt(timeMatch[1]),
      unit: timeMatch[2],
    };
  }

  // Extract mentions of specific items
  const forMatch = text.match(/for\s+([a-zA-Z0-9\s]+)/i);
  if (forMatch) {
    params.target = forMatch[1].trim();
  }

  // Extract quoted strings
  const quotedMatch = text.match(/"([^"]+)"/);
  if (quotedMatch) {
    params.quotedText = quotedMatch[1];
  }

  return params;
}

/**
 * Generate smart suggestions based on partial input
 */
function generateSuggestions(partialText: string): string[] {
  const suggestions: string[] = [];

  // Based on first few characters, suggest commands
  if (partialText.startsWith('anal')) {
    suggestions.push('Analyze sales data for last quarter');
    suggestions.push('Analyze customer feedback');
  } else if (partialText.startsWith('send')) {
    suggestions.push('Send email to team');
    suggestions.push('Send report to manager');
  } else if (partialText.startsWith('code') || partialText.startsWith('rev')) {
    suggestions.push('Review code for security issues');
    suggestions.push('Code a new feature');
  } else if (partialText.startsWith('help') || partialText.startsWith('supp')) {
    suggestions.push('Help customer with login issue');
    suggestions.push('Support ticket #123');
  } else if (partialText.startsWith('calc') || partialText.startsWith('fin')) {
    suggestions.push('Calculate monthly expenses');
    suggestions.push('Financial forecast for Q2');
  } else {
    // Default suggestions
    suggestions.push('Analyze sales trends');
    suggestions.push('Send weekly report');
    suggestions.push('Review recent changes');
  }

  return suggestions.slice(0, 3);
}

/**
 * Common command templates for quick actions
 */
export const COMMAND_TEMPLATES = [
  {
    category: 'Analytics',
    commands: [
      'Analyze sales data for last quarter',
      'Show customer engagement metrics',
      'Create revenue report',
      'Visualize user growth trends',
    ],
  },
  {
    category: 'Communication',
    commands: [
      'Send weekly update email',
      'Draft message to team',
      'Compose client proposal',
      'Send thank you note',
    ],
  },
  {
    category: 'Support',
    commands: [
      'Help customer with billing issue',
      'Resolve support ticket #123',
      'Answer customer inquiry',
      'Create FAQ document',
    ],
  },
  {
    category: 'Development',
    commands: [
      'Review code for bugs',
      'Debug production error',
      'Write unit tests',
      'Optimize database queries',
    ],
  },
  {
    category: 'Finance',
    commands: [
      'Calculate monthly burn rate',
      'Forecast Q2 revenue',
      'Analyze budget allocation',
      'Track expense trends',
    ],
  },
  {
    category: 'Strategy',
    commands: [
      'Create product roadmap',
      'Plan marketing campaign',
      'Research competitor analysis',
      'Innovate new features',
    ],
  },
];

/**
 * Command history manager
 */
export class CommandHistory {
  private history: ParsedCommand[] = [];
  private maxHistory = 50;

  add(command: ParsedCommand) {
    this.history.unshift(command);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  getRecent(limit: number = 10): ParsedCommand[] {
    return this.history.slice(0, limit);
  }

  getMostUsedIntents(): { intent: CommandIntent; count: number }[] {
    const intentCounts = new Map<CommandIntent, number>();

    this.history.forEach(cmd => {
      intentCounts.set(cmd.intent, (intentCounts.get(cmd.intent) || 0) + 1);
    });

    return Array.from(intentCounts.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count);
  }

  clear() {
    this.history = [];
  }
}
