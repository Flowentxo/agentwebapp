import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ConversationPriority {
  conversationId: string;
  priority: 1 | 2 | 3 | 4 | 5; // 1 = Highest, 5 = Lowest
  urgency: 'critical' | 'high' | 'medium' | 'low';
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPoints: string[];
  actionItems: string[];
  reasoning: string;
  confidence: number; // 0-1
}

export interface ConversationInput {
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastMessageRole: 'user' | 'assistant';
  messageCount: number;
  lastMessageAt: Date;
  unreadCount?: number;
}

/**
 * Analyze conversations and assign intelligent priority
 * Uses OpenAI GPT-4o-mini for fast, cost-effective analysis
 */
export async function prioritizeConversations(
  conversations: ConversationInput[]
): Promise<ConversationPriority[]> {
  if (conversations.length === 0) return [];

  try {
    const systemPrompt = buildPrioritySystemPrompt();
    const userPrompt = buildUserPrompt(conversations);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for consistent analysis
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.priorities || [];
  } catch (error) {
    console.error('[AI_PRIORITIZER] Error:', error);
    // Fallback to basic priority based on unread count and time
    return conversations.map(conv => ({
      conversationId: conv.agentId,
      priority: calculateFallbackPriority(conv),
      urgency: 'medium' as const,
      sentiment: 'neutral' as const,
      keyPoints: [],
      actionItems: [],
      reasoning: 'AI analysis unavailable, using fallback logic',
      confidence: 0.5
    }));
  }
}

/**
 * Analyze a single conversation for sentiment and key insights
 */
export async function analyzeConversation(
  agentName: string,
  lastMessage: string,
  messageHistory?: string[]
): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPoints: string[];
  actionItems: string[];
  suggestedResponse?: string;
}> {
  try {
    const systemPrompt = `You are an expert communication analyst. Analyze conversations and extract:
1. Overall sentiment (positive/neutral/negative)
2. Key points (2-3 main topics)
3. Action items (if any)
4. Suggested response (if needed)

Return your analysis as JSON.`;

    const context = messageHistory ? messageHistory.join('\n') : '';
    const userPrompt = `Analyze this conversation with ${agentName}:

Recent message: "${lastMessage}"
${context ? `\nContext:\n${context}` : ''}

Provide: sentiment, keyPoints (array), actionItems (array), suggestedResponse (optional)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      sentiment: result.sentiment || 'neutral',
      keyPoints: result.keyPoints || [],
      actionItems: result.actionItems || [],
      suggestedResponse: result.suggestedResponse
    };
  } catch (error) {
    console.error('[AI_ANALYZER] Error:', error);
    return {
      sentiment: 'neutral',
      keyPoints: [],
      actionItems: []
    };
  }
}

/**
 * Smart Archive Decision
 * Determines if a conversation should be auto-archived
 */
export async function shouldAutoArchive(
  conversation: ConversationInput,
  userBehaviorPattern?: {
    averageResponseTime: number;
    typicallyArchivesAfterDays: number;
    archivedSimilarConversations: number;
  }
): Promise<{
  shouldArchive: boolean;
  confidence: number;
  reasoning: string;
}> {
  try {
    const daysSinceLastMessage = Math.floor(
      (Date.now() - new Date(conversation.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Rule-based logic (fast)
    if (daysSinceLastMessage > 7 && conversation.unreadCount === 0) {
      return {
        shouldArchive: true,
        confidence: 0.8,
        reasoning: 'No activity for 7+ days and no unread messages'
      };
    }

    // AI-based analysis for edge cases
    const systemPrompt = `You are an intelligent inbox assistant. Analyze if this conversation should be archived based on:
- Time since last activity
- Conversation context
- User behavior patterns

Return JSON with: shouldArchive (boolean), confidence (0-1), reasoning (string)`;

    const userPrompt = `Conversation: ${conversation.agentName}
Last message: "${conversation.lastMessage}"
Days since last activity: ${daysSinceLastMessage}
Unread count: ${conversation.unreadCount || 0}
${userBehaviorPattern ? `User typically archives after ${userBehaviorPattern.typicallyArchivesAfterDays} days` : ''}

Should this be archived?`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      shouldArchive: result.shouldArchive || false,
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'AI analysis'
    };
  } catch (error) {
    console.error('[SMART_ARCHIVE] Error:', error);
    return {
      shouldArchive: false,
      confidence: 0,
      reasoning: 'Analysis failed'
    };
  }
}

// Helper: Build system prompt for prioritization
function buildPrioritySystemPrompt(): string {
  return `You are an expert inbox prioritization AI. Analyze conversations and assign intelligent priority based on:

1. URGENCY INDICATORS:
   - Keywords: urgent, asap, important, critical, deadline, emergency
   - Questions or requests
   - Time-sensitive information
   - Unread message count

2. SENTIMENT:
   - Positive: gratitude, satisfaction, praise
   - Neutral: informational, routine
   - Negative: complaints, issues, frustration

3. PRIORITY LEVELS:
   - 1 (Critical): Urgent issues, high-value opportunities, time-sensitive
   - 2 (High): Important tasks, key decisions needed
   - 3 (Medium): Normal conversations, follow-ups
   - 4 (Low): Informational, nice-to-have
   - 5 (Noise): Low value, can wait

4. KEY POINTS: Extract 2-3 main topics
5. ACTION ITEMS: Identify next steps required

Return JSON format:
{
  "priorities": [
    {
      "conversationId": "agent-id",
      "priority": 1-5,
      "urgency": "critical|high|medium|low",
      "sentiment": "positive|neutral|negative",
      "keyPoints": ["point1", "point2"],
      "actionItems": ["action1"],
      "reasoning": "brief explanation",
      "confidence": 0.0-1.0
    }
  ]
}

Be concise, accurate, and actionable.`;
}

// Helper: Build user prompt with conversation list
function buildUserPrompt(conversations: ConversationInput[]): string {
  const conversationList = conversations.map((conv, idx) => {
    const timeSince = getTimeSinceString(conv.lastMessageAt);
    return `${idx + 1}. [${conv.agentId}] ${conv.agentName}
   Last message (${timeSince}): "${truncate(conv.lastMessage, 150)}"
   Role: ${conv.lastMessageRole}
   Unread: ${conv.unreadCount || 0}
   Total messages: ${conv.messageCount}`;
  }).join('\n\n');

  return `Analyze and prioritize these ${conversations.length} conversations:\n\n${conversationList}`;
}

// Helper: Calculate fallback priority
function calculateFallbackPriority(conv: ConversationInput): 1 | 2 | 3 | 4 | 5 {
  const unreadCount = conv.unreadCount || 0;
  const daysSinceLastMessage = Math.floor(
    (Date.now() - new Date(conv.lastMessageAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (unreadCount >= 3 || daysSinceLastMessage === 0) return 1;
  if (unreadCount >= 1 || daysSinceLastMessage <= 1) return 2;
  if (daysSinceLastMessage <= 3) return 3;
  if (daysSinceLastMessage <= 7) return 4;
  return 5;
}

// Helper: Get time since string
function getTimeSinceString(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Helper: Truncate text
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
