/**
 * PHASE 41-45: Sentiment Analyzer Tool
 * AI-powered sentiment and emotion analysis
 */

import { OpenAIService } from '@/server/services/OpenAIService';

// ============================================
// TYPES
// ============================================

export interface SentimentScore {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
}

export interface EmotionDetection {
  primary: string;
  secondary: string[];
  intensities: Record<string, number>;
}

export interface UrgencyAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0 to 1
  indicators: string[];
}

export interface IntentClassification {
  primary: string;
  confidence: number;
  alternatives: Array<{ intent: string; confidence: number }>;
}

export interface LanguageAnalysis {
  formality: 'informal' | 'casual' | 'neutral' | 'formal' | 'very_formal';
  complexity: 'simple' | 'moderate' | 'complex';
  clarity: number; // 0 to 1
  issues: string[];
}

export interface SentimentAnalysisResult {
  sentiment: SentimentScore;
  emotions: EmotionDetection;
  urgency: UrgencyAssessment;
  intent: IntentClassification;
  language: LanguageAnalysis;
  keyPhrases: string[];
  topics: string[];
  entities: Array<{ text: string; type: string }>;
  suggestions: {
    priority: string;
    responseApproach: string;
    escalationRecommended: boolean;
    calmingPhrases: string[];
  };
}

export interface BatchSentimentResult {
  items: Array<{
    id: string;
    sentiment: SentimentScore;
    urgency: UrgencyAssessment;
  }>;
  aggregates: {
    averageSentiment: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    urgentCount: number;
  };
}

// ============================================
// SENTIMENT ANALYZER CLASS
// ============================================

export class SentimentAnalyzer {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  /**
   * Perform comprehensive sentiment analysis
   */
  public async analyze(text: string): Promise<SentimentAnalysisResult> {
    // Basic analysis with pattern matching
    const basicSentiment = this.quickSentiment(text);
    const basicUrgency = this.quickUrgency(text);
    const keyPhrases = this.extractKeyPhrases(text);

    // AI-powered deep analysis
    let aiAnalysis;
    try {
      aiAnalysis = await this.deepAnalysis(text);
    } catch {
      // Fallback to basic analysis if AI fails
      aiAnalysis = null;
    }

    // Combine results
    return {
      sentiment: aiAnalysis?.sentiment || basicSentiment,
      emotions: aiAnalysis?.emotions || this.basicEmotions(text),
      urgency: aiAnalysis?.urgency || basicUrgency,
      intent: aiAnalysis?.intent || this.basicIntent(text),
      language: this.analyzeLanguage(text),
      keyPhrases,
      topics: this.extractTopics(text),
      entities: this.extractEntities(text),
      suggestions: this.generateSuggestions(
        aiAnalysis?.sentiment || basicSentiment,
        aiAnalysis?.urgency || basicUrgency,
        aiAnalysis?.emotions || this.basicEmotions(text)
      ),
    };
  }

  /**
   * Batch sentiment analysis for multiple items
   */
  public async analyzeBatch(
    items: Array<{ id: string; text: string }>
  ): Promise<BatchSentimentResult> {
    const results = await Promise.all(
      items.map(async (item) => {
        const sentiment = this.quickSentiment(item.text);
        const urgency = this.quickUrgency(item.text);

        return {
          id: item.id,
          sentiment,
          urgency,
        };
      })
    );

    const positiveCount = results.filter(r => r.sentiment.overall === 'positive').length;
    const neutralCount = results.filter(r => r.sentiment.overall === 'neutral').length;
    const negativeCount = results.filter(r => r.sentiment.overall === 'negative').length;
    const urgentCount = results.filter(r => r.urgency.level === 'critical' || r.urgency.level === 'high').length;

    return {
      items: results,
      aggregates: {
        averageSentiment: results.reduce((sum, r) => sum + r.sentiment.score, 0) / results.length,
        positiveCount,
        neutralCount,
        negativeCount,
        urgentCount,
      },
    };
  }

  /**
   * Track sentiment over time for a customer
   */
  public analyzeTrend(
    interactions: Array<{ date: Date; sentiment: number }>
  ): {
    trend: 'improving' | 'stable' | 'declining';
    changeRate: number;
    volatility: number;
    concernAreas: string[];
  } {
    if (interactions.length < 2) {
      return {
        trend: 'stable',
        changeRate: 0,
        volatility: 0,
        concernAreas: [],
      };
    }

    // Sort by date
    const sorted = [...interactions].sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate trend (linear regression slope)
    const n = sorted.length;
    const xMean = (n - 1) / 2;
    const yMean = sorted.reduce((sum, i) => sum + i.sentiment, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (sorted[i].sentiment - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Calculate volatility (standard deviation)
    const variance = sorted.reduce((sum, i) => sum + (i.sentiment - yMean) ** 2, 0) / n;
    const volatility = Math.sqrt(variance);

    // Identify concern areas
    const concernAreas: string[] = [];
    const recentAvg = sorted.slice(-3).reduce((sum, i) => sum + i.sentiment, 0) / 3;

    if (recentAvg < -0.3) {
      concernAreas.push('Recent interactions show negative sentiment');
    }

    if (slope < -0.1) {
      concernAreas.push('Sentiment trending downward');
    }

    if (volatility > 0.5) {
      concernAreas.push('High sentiment variability indicates inconsistent experience');
    }

    return {
      trend: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
      changeRate: slope,
      volatility,
      concernAreas,
    };
  }

  /**
   * Compare sentiment across channels
   */
  public compareChannels(
    data: Array<{ channel: string; sentiment: number }>
  ): Record<string, {
    average: number;
    count: number;
    comparison: 'above_average' | 'average' | 'below_average';
  }> {
    const byChannel = new Map<string, number[]>();

    for (const item of data) {
      if (!byChannel.has(item.channel)) {
        byChannel.set(item.channel, []);
      }
      byChannel.get(item.channel)!.push(item.sentiment);
    }

    const overallAverage = data.reduce((sum, d) => sum + d.sentiment, 0) / data.length;

    const result: Record<string, any> = {};

    for (const [channel, sentiments] of byChannel.entries()) {
      const average = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;

      result[channel] = {
        average,
        count: sentiments.length,
        comparison: average > overallAverage + 0.1
          ? 'above_average'
          : average < overallAverage - 0.1
            ? 'below_average'
            : 'average',
      };
    }

    return result;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private quickSentiment(text: string): SentimentScore {
    const lower = text.toLowerCase();

    // Positive indicators
    const positiveWords = ['thank', 'great', 'excellent', 'love', 'amazing', 'awesome', 'perfect', 'happy', 'satisfied', 'helpful'];
    const positiveCount = positiveWords.filter(w => lower.includes(w)).length;

    // Negative indicators
    const negativeWords = ['angry', 'frustrated', 'disappointed', 'terrible', 'awful', 'hate', 'worst', 'unacceptable', 'horrible', 'useless'];
    const negativeCount = negativeWords.filter(w => lower.includes(w)).length;

    // Intensifiers
    const intensifiers = ['very', 'extremely', 'really', 'absolutely', 'completely'];
    const intensifierCount = intensifiers.filter(w => lower.includes(w)).length;

    // Calculate score
    const rawScore = (positiveCount - negativeCount) * (1 + intensifierCount * 0.2);
    const normalizedScore = Math.max(-1, Math.min(1, rawScore / 3));

    let overall: 'positive' | 'neutral' | 'negative';
    if (normalizedScore > 0.2) overall = 'positive';
    else if (normalizedScore < -0.2) overall = 'negative';
    else overall = 'neutral';

    return {
      overall,
      score: normalizedScore,
      confidence: Math.min(0.9, 0.5 + (positiveCount + negativeCount) * 0.1),
    };
  }

  private quickUrgency(text: string): UrgencyAssessment {
    const lower = text.toLowerCase();

    const indicators: string[] = [];
    let score = 0;

    // Urgency keywords
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('emergency')) {
      score += 0.4;
      indicators.push('Explicit urgency keywords');
    }

    if (lower.includes('immediately') || lower.includes('right now') || lower.includes('today')) {
      score += 0.3;
      indicators.push('Time-sensitive language');
    }

    if (lower.includes('down') || lower.includes('broken') || lower.includes('not working')) {
      score += 0.2;
      indicators.push('Service disruption mentioned');
    }

    if (lower.includes('cancel') || lower.includes('leaving') || lower.includes('competitor')) {
      score += 0.3;
      indicators.push('Churn risk indicators');
    }

    // Exclamation marks indicate urgency
    const exclamations = (text.match(/!/g) || []).length;
    if (exclamations > 2) {
      score += 0.1;
      indicators.push('Multiple exclamation marks');
    }

    // All caps words
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    if (capsWords > 2) {
      score += 0.1;
      indicators.push('Emphasized capitalization');
    }

    score = Math.min(1, score);

    let level: UrgencyAssessment['level'];
    if (score >= 0.7) level = 'critical';
    else if (score >= 0.5) level = 'high';
    else if (score >= 0.3) level = 'medium';
    else level = 'low';

    return { level, score, indicators };
  }

  private basicEmotions(text: string): EmotionDetection {
    const lower = text.toLowerCase();

    const emotionKeywords: Record<string, string[]> = {
      frustration: ['frustrated', 'annoying', 'irritating', 'fed up'],
      anger: ['angry', 'furious', 'outraged', 'livid'],
      confusion: ['confused', 'don\'t understand', 'unclear', 'lost'],
      disappointment: ['disappointed', 'let down', 'expected more'],
      satisfaction: ['satisfied', 'pleased', 'happy', 'glad'],
      gratitude: ['thank', 'grateful', 'appreciate'],
      anxiety: ['worried', 'anxious', 'concerned', 'nervous'],
    };

    const intensities: Record<string, number> = {};
    let maxEmotion = 'neutral';
    let maxIntensity = 0;

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(k => lower.includes(k)).length;
      intensities[emotion] = Math.min(1, matches * 0.3);

      if (intensities[emotion] > maxIntensity) {
        maxIntensity = intensities[emotion];
        maxEmotion = emotion;
      }
    }

    const secondary = Object.entries(intensities)
      .filter(([e, i]) => e !== maxEmotion && i > 0.2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([e]) => e);

    return {
      primary: maxEmotion,
      secondary,
      intensities,
    };
  }

  private basicIntent(text: string): IntentClassification {
    const lower = text.toLowerCase();

    const intents: Array<{ intent: string; keywords: string[] }> = [
      { intent: 'complaint', keywords: ['problem', 'issue', 'not working', 'broken', 'complaint'] },
      { intent: 'question', keywords: ['how', 'what', 'when', 'where', 'why', 'can i', 'could you'] },
      { intent: 'request', keywords: ['please', 'need', 'want', 'would like', 'can you'] },
      { intent: 'feedback', keywords: ['suggest', 'feedback', 'recommendation', 'idea'] },
      { intent: 'cancellation', keywords: ['cancel', 'unsubscribe', 'stop', 'terminate'] },
      { intent: 'billing', keywords: ['charge', 'bill', 'payment', 'invoice', 'refund'] },
      { intent: 'gratitude', keywords: ['thank', 'appreciate', 'grateful', 'thanks'] },
    ];

    const scores: Array<{ intent: string; score: number }> = [];

    for (const { intent, keywords } of intents) {
      const matches = keywords.filter(k => lower.includes(k)).length;
      scores.push({ intent, score: matches / keywords.length });
    }

    scores.sort((a, b) => b.score - a.score);

    return {
      primary: scores[0]?.intent || 'general',
      confidence: scores[0]?.score || 0.3,
      alternatives: scores.slice(1, 3).map(s => ({
        intent: s.intent,
        confidence: s.score,
      })),
    };
  }

  private analyzeLanguage(text: string): LanguageAnalysis {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    // Formality indicators
    const formalWords = ['please', 'kindly', 'regarding', 'concerning', 'hereby', 'therefore'];
    const informalWords = ['hey', 'hi', 'gonna', 'wanna', 'gotta', 'kinda', 'lol', 'omg'];

    const formalCount = formalWords.filter(w => text.toLowerCase().includes(w)).length;
    const informalCount = informalWords.filter(w => text.toLowerCase().includes(w)).length;

    let formality: LanguageAnalysis['formality'];
    if (formalCount > 2) formality = 'very_formal';
    else if (formalCount > 0) formality = 'formal';
    else if (informalCount > 2) formality = 'informal';
    else if (informalCount > 0) formality = 'casual';
    else formality = 'neutral';

    // Complexity
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const avgSentenceLength = words.length / sentences.length;

    let complexity: LanguageAnalysis['complexity'];
    if (avgWordLength > 6 && avgSentenceLength > 20) complexity = 'complex';
    else if (avgWordLength < 4 && avgSentenceLength < 10) complexity = 'simple';
    else complexity = 'moderate';

    // Clarity issues
    const issues: string[] = [];
    if (avgSentenceLength > 30) issues.push('Long sentences may reduce clarity');
    if (text.includes('...') || text.includes('?!')) issues.push('Ambiguous punctuation');
    if ((text.match(/\b(it|this|that|they)\b/gi) || []).length > 5) {
      issues.push('Excessive use of pronouns may cause confusion');
    }

    const clarity = Math.max(0, 1 - issues.length * 0.2);

    return { formality, complexity, clarity, issues };
  }

  private extractKeyPhrases(text: string): string[] {
    // Simple noun phrase extraction
    const words = text.split(/\s+/);
    const phrases: string[] = [];

    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`.toLowerCase();
      if (phrase.length > 5 && !phrase.match(/^(the|a|an|is|are|was|were)\s/)) {
        phrases.push(phrase);
      }
    }

    // Return unique phrases
    return [...new Set(phrases)].slice(0, 10);
  }

  private extractTopics(text: string): string[] {
    const lower = text.toLowerCase();

    const topicKeywords: Record<string, string[]> = {
      billing: ['payment', 'invoice', 'charge', 'subscription', 'plan', 'price'],
      technical: ['error', 'bug', 'crash', 'loading', 'slow', 'feature', 'integration'],
      account: ['login', 'password', 'account', 'profile', 'settings', 'email'],
      product: ['product', 'service', 'quality', 'update', 'version'],
      shipping: ['shipping', 'delivery', 'order', 'tracking', 'arrived'],
    };

    const topics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => lower.includes(k))) {
        topics.push(topic);
      }
    }

    return topics.length > 0 ? topics : ['general'];
  }

  private extractEntities(text: string): Array<{ text: string; type: string }> {
    const entities: Array<{ text: string; type: string }> = [];

    // Email
    const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    emails.forEach(e => entities.push({ text: e, type: 'email' }));

    // Phone
    const phones = text.match(/\+?[\d\s-()]{10,}/g) || [];
    phones.forEach(p => entities.push({ text: p.trim(), type: 'phone' }));

    // Order/Ticket IDs
    const ids = text.match(/\b[A-Z]{2,4}-?\d{4,}\b/g) || [];
    ids.forEach(id => entities.push({ text: id, type: 'id' }));

    // Dates
    const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g) || [];
    dates.forEach(d => entities.push({ text: d, type: 'date' }));

    // Money
    const money = text.match(/\$\d+(?:\.\d{2})?/g) || [];
    money.forEach(m => entities.push({ text: m, type: 'money' }));

    return entities;
  }

  private generateSuggestions(
    sentiment: SentimentScore,
    urgency: UrgencyAssessment,
    emotions: EmotionDetection
  ): SentimentAnalysisResult['suggestions'] {
    const priority = urgency.level === 'critical' ? 'urgent'
      : urgency.level === 'high' ? 'high'
        : sentiment.score < -0.3 ? 'medium'
          : 'normal';

    let responseApproach = 'Standard professional response';

    if (sentiment.overall === 'negative' && emotions.primary === 'frustration') {
      responseApproach = 'Acknowledge frustration, apologize sincerely, offer concrete solution';
    } else if (sentiment.overall === 'negative' && emotions.primary === 'anger') {
      responseApproach = 'De-escalate with empathy, avoid defensive language, focus on resolution';
    } else if (sentiment.overall === 'positive') {
      responseApproach = 'Match enthusiasm, reinforce positive experience, offer additional value';
    }

    const escalationRecommended = urgency.level === 'critical' ||
      (sentiment.score < -0.5 && emotions.primary === 'anger');

    const calmingPhrases: string[] = [];
    if (sentiment.overall === 'negative') {
      calmingPhrases.push('I completely understand your frustration');
      calmingPhrases.push('I sincerely apologize for this experience');
      calmingPhrases.push('Let me personally ensure this gets resolved');
      calmingPhrases.push('Your feedback is valuable and helps us improve');
    }

    return {
      priority,
      responseApproach,
      escalationRecommended,
      calmingPhrases,
    };
  }

  private async deepAnalysis(text: string): Promise<Partial<SentimentAnalysisResult> | null> {
    try {
      const prompt = `Analyze the following customer support message and return a JSON object with:
{
  "sentiment": {
    "overall": "positive" | "neutral" | "negative",
    "score": number between -1 and 1,
    "confidence": number between 0 and 1
  },
  "emotions": {
    "primary": string (main emotion),
    "secondary": array of other emotions,
    "intensities": object with emotion names as keys and intensity 0-1 as values
  },
  "urgency": {
    "level": "low" | "medium" | "high" | "critical",
    "score": number 0-1,
    "indicators": array of reasons for urgency level
  },
  "intent": {
    "primary": string (main intent),
    "confidence": number 0-1,
    "alternatives": array of {intent, confidence} objects
  }
}

Message: "${text}"`;

      const response = await this.openaiService.chat([
        { role: 'system', content: 'You are a sentiment analysis expert. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ]);

      return JSON.parse(response.content);
    } catch {
      return null;
    }
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();
