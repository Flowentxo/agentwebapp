/**
 * Omni-Orchestrator Routing Service
 *
 * Analyzes user messages and routes them to the most appropriate agent
 * using LLM-based intent classification.
 *
 * Example:
 * - "Prüfe den Vertrag auf Risiken" → Lex (Legal)
 * - "Wie hoch ist unser Cashflow?" → Dexter (Finance)
 * - "Schreibe eine Follow-up E-Mail" → Emmie (Email)
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { agentPersonas, getAgentById } from '../../lib/agents/personas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface RoutingResult {
  selectedAgent: string;
  confidence: number;
  reasoning: string;
  keywords: string[];
  previousAgent?: string;
  wasRouted: boolean;
}

interface RoutingCache {
  [key: string]: {
    result: RoutingResult;
    timestamp: number;
  };
}

// Simple in-memory cache for similar queries (5 minute TTL)
const routingCache: RoutingCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Build agent descriptions for the routing prompt
 */
function buildAgentDescriptions(): string {
  const descriptions = agentPersonas
    .filter(agent => agent.status === 'active' && agent.available)
    .map(agent => {
      const specialties = agent.specialties.join(', ');
      return `- ${agent.id}: ${agent.role}. ${agent.bio} Spezialisiert auf: ${specialties}`;
    });

  return descriptions.join('\n');
}

/**
 * Generate routing system prompt
 */
function getRoutingSystemPrompt(): string {
  const agentDescriptions = buildAgentDescriptions();

  return `Du bist ein Intent-Classifier für das Flowent AI System. Deine Aufgabe ist es, Benutzeranfragen zu analysieren und sie dem passendsten KI-Agenten zuzuordnen.

VERFÜGBARE AGENTEN:
${agentDescriptions}

WICHTIGE REGELN:
1. Wähle den Agenten, dessen Spezialisierung am besten zur Anfrage passt
2. Bei Finanzfragen (ROI, Cashflow, P&L, Forecasts) → dexter
3. Bei Rechtsfragen (Verträge, Compliance, Risiken) → lex
4. Bei E-Mail-Aufgaben (Schreiben, Kampagnen, Templates) → emmie
5. Bei Kundensupport (Tickets, FAQ, Beschwerden) → cassie
6. Bei Code/Programmierung → kai
7. Bei Recherche/Marktanalysen → nova
8. Bei Automatisierung/Workflows → ari
9. Bei unklaren oder Multi-Themen Anfragen → omni
10. Confidence unter 0.5 bedeutet: wähle omni als Fallback

Antworte NUR mit einem validen JSON-Objekt (keine Markdown-Formatierung):
{
  "agent": "agent_id",
  "confidence": 0.0-1.0,
  "reasoning": "Kurze Begründung auf Deutsch",
  "keywords": ["erkannte", "schlüsselwörter"]
}`;
}

/**
 * Parse LLM response into RoutingResult
 */
function parseRoutingResponse(response: string, previousAgent?: string): RoutingResult {
  try {
    // Remove potential markdown code blocks
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanedResponse);

    // Validate agent exists
    const agent = getAgentById(parsed.agent);
    if (!agent) {
      logger.warn(`[ROUTING] Unknown agent: ${parsed.agent}, falling back to omni`);
      return {
        selectedAgent: 'omni',
        confidence: 0.3,
        reasoning: 'Unbekannter Agent - Fallback zu Omni',
        keywords: [],
        previousAgent,
        wasRouted: previousAgent !== 'omni'
      };
    }

    return {
      selectedAgent: parsed.agent,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || 'Keine Begründung verfügbar',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      previousAgent,
      wasRouted: previousAgent !== parsed.agent
    };
  } catch (error) {
    logger.error('[ROUTING] Failed to parse response:', error, response);
    return {
      selectedAgent: 'omni',
      confidence: 0.3,
      reasoning: 'Parsing-Fehler - Fallback zu Omni',
      keywords: [],
      previousAgent,
      wasRouted: previousAgent !== 'omni'
    };
  }
}

/**
 * Generate a cache key from the message
 */
function getCacheKey(message: string): string {
  // Simple hash: lowercase, remove punctuation, first 100 chars
  return message
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .substring(0, 100)
    .trim();
}

/**
 * Check if routing is enabled
 */
function isRoutingEnabled(): boolean {
  return process.env.DISABLE_ROUTING !== 'true';
}

/**
 * Main routing class
 */
export class RoutingService {
  private static instance: RoutingService;

  private constructor() {
    logger.info('[ROUTING] RoutingService initialized');
  }

  static getInstance(): RoutingService {
    if (!RoutingService.instance) {
      RoutingService.instance = new RoutingService();
    }
    return RoutingService.instance;
  }

  /**
   * Classify user intent and select the best agent
   */
  async classifyIntent(
    message: string,
    currentAgentId?: string,
    conversationContext?: string[]
  ): Promise<RoutingResult> {
    // If routing is disabled, keep current agent
    if (!isRoutingEnabled()) {
      logger.info('[ROUTING] Routing disabled, keeping current agent');
      return {
        selectedAgent: currentAgentId || 'omni',
        confidence: 1,
        reasoning: 'Routing deaktiviert',
        keywords: [],
        previousAgent: currentAgentId,
        wasRouted: false
      };
    }

    // Check cache first
    const cacheKey = getCacheKey(message);
    const cached = routingCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info('[ROUTING] Cache hit:', cached.result.selectedAgent);
      return {
        ...cached.result,
        previousAgent: currentAgentId,
        wasRouted: currentAgentId !== cached.result.selectedAgent
      };
    }

    try {
      // Build context from recent messages if available
      let contextPrompt = '';
      if (conversationContext && conversationContext.length > 0) {
        contextPrompt = `\n\nKONTEXT (letzte Nachrichten):\n${conversationContext.slice(-3).join('\n')}`;
      }

      const userPrompt = `Analysiere diese Nachricht und wähle den besten Agenten:

NACHRICHT: "${message}"${contextPrompt}

Antworte nur mit JSON.`;

      logger.info('[ROUTING] Classifying intent for message:', message.substring(0, 50));

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast model for routing
        max_completion_tokens: 200,
        temperature: 0.1, // Low temperature for consistent classification
        messages: [
          { role: 'system', content: getRoutingSystemPrompt() },
          { role: 'user', content: userPrompt },
        ],
      });

      const responseText = response.choices[0]?.message?.content || '';

      const result = parseRoutingResponse(responseText, currentAgentId);

      // Apply confidence threshold - fallback to omni if too low
      if (result.confidence < 0.5 && result.selectedAgent !== 'omni') {
        logger.info(`[ROUTING] Low confidence (${result.confidence}), falling back to omni`);
        result.selectedAgent = 'omni';
        result.reasoning += ' (niedriges Vertrauen - Fallback)';
      }

      // Cache the result
      routingCache[cacheKey] = {
        result,
        timestamp: Date.now()
      };

      // Log routing decision
      logger.info(`[ROUTING] Selected: ${result.selectedAgent} (confidence: ${result.confidence})`);
      logger.info(`[ROUTING] Reasoning: ${result.reasoning}`);

      return result;

    } catch (error: any) {
      logger.error('[ROUTING] Classification failed:', error);

      // Fallback to current agent or omni
      return {
        selectedAgent: currentAgentId || 'omni',
        confidence: 0.3,
        reasoning: 'Klassifikation fehlgeschlagen - Fallback',
        keywords: [],
        previousAgent: currentAgentId,
        wasRouted: false
      };
    }
  }

  /**
   * Clear the routing cache
   */
  clearCache(): void {
    Object.keys(routingCache).forEach(key => delete routingCache[key]);
    logger.info('[ROUTING] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    const entries = Object.values(routingCache);
    return {
      size: entries.length,
      oldestEntry: entries.length > 0
        ? Math.min(...entries.map(e => e.timestamp))
        : null
    };
  }
}

// Export singleton instance
export const routingService = RoutingService.getInstance();
