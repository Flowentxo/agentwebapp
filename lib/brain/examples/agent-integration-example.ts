/**
 * Example: Agent Integration with Brain AI
 * Shows how agents use BrainClient SDK for intelligent interactions
 */

import { getBrainClient } from '../BrainClient';
import { getAutoContextCapture } from '../AutoContextCapture';
import type { AgentPersona } from '@/lib/agents/personas';

// ============================================
// Example 1: Dexter (Data Analyst Agent)
// ============================================

export async function dexterAgentExample() {
  // Initialize BrainClient for Dexter
  const brainClient = getBrainClient({
    agentId: 'dexter',
    agentName: 'Dexter',
    apiKey: 'brain_dexter_secure_api_key_here', // From agent config
    workspaceId: 'default-workspace',
    enableAutoContext: true,
  });

  // Initialize Auto Context Capture
  const contextCapture = getAutoContextCapture({
    agentId: 'dexter',
    agentName: 'Dexter',
    enableAutoCapture: true,
    bufferSize: 5,
    enableTopicExtraction: true,
    enableIntentClassification: true,
  });

  // ============================================
  // Scenario: User asks about sales data
  // ============================================

  const sessionId = 'session-123';
  const userId = 'user-456';
  const userMessage = 'Show me Q4 2024 sales trends';

  // 1. Capture user message
  contextCapture.captureMessage(
    sessionId,
    userId,
    'user',
    userMessage
  );

  // 2. Query Brain for relevant knowledge
  const knowledgeResult = await brainClient.queryKnowledge(
    'Q4 2024 sales trends analysis',
    {
      searchType: 'hybrid',
      limit: 3,
      includeContext: true, // Include previous conversation context
      filters: {
        tags: ['sales', 'data'],
        category: 'analytics',
      },
    }
  );

  console.log('Found knowledge:', knowledgeResult.totalResults);
  console.log('Context:', knowledgeResult.context);

  // 3. Use knowledge to formulate response
  const assistantMessage = `Based on the data, Q4 2024 sales show a 15% increase...`;

  // 4. Capture assistant response
  contextCapture.captureMessage(
    sessionId,
    userId,
    'assistant',
    assistantMessage,
    {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tokensUsed: 250,
      responseTime: 1200,
    }
  );

  // 5. Index new insights for future reference
  await brainClient.indexKnowledge(
    'Q4 2024 Sales Analysis',
    'Q4 2024 sales increased by 15% compared to Q3...',
    {
      tags: ['sales', 'Q4', '2024', 'analysis'],
      category: 'analytics',
      sourceType: 'agent-generated',
    }
  );

  // 6. Send performance metrics
  await brainClient.sendLearnings({
    agentId: 'dexter',
    sessionId,
    userId,
    metrics: {
      successRate: 95,
      averageResponseTime: 1200,
      userSatisfaction: 4.5,
      tasksCompleted: 1,
    },
    insights: [
      {
        pattern: 'Users frequently ask about Q4 sales data',
        confidence: 85,
        evidence: ['session-123', 'session-120', 'session-115'],
      },
    ],
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// Example 2: Cassie (Customer Support Agent)
// ============================================

export async function cassieAgentExample() {
  const brainClient = getBrainClient({
    agentId: 'cassie',
    agentName: 'Cassie',
    apiKey: 'brain_cassie_secure_api_key_here',
    workspaceId: 'default-workspace',
  });

  const contextCapture = getAutoContextCapture({
    agentId: 'cassie',
    agentName: 'Cassie',
    enableTopicExtraction: true,
  });

  // ============================================
  // Scenario: Customer has login issue
  // ============================================

  const sessionId = 'support-session-789';
  const userId = 'customer-101';

  // 1. Capture customer issue
  const customerMessage = "I can't log in to my account";
  contextCapture.captureMessage(sessionId, userId, 'user', customerMessage);

  // 2. Query knowledge base for solutions
  const solutions = await brainClient.queryKnowledge(
    'login issue troubleshooting',
    {
      searchType: 'hybrid',
      limit: 5,
      filters: {
        tags: ['authentication', 'troubleshooting'],
        category: 'customer-support',
      },
    }
  );

  // 3. Get suggested queries for similar issues
  const suggestedQueries = await brainClient.getSuggestedQueries(3);
  console.log('Similar issues:', suggestedQueries);

  // 4. Formulate response based on knowledge
  const response = `I understand you're having trouble logging in. Let's try these steps:\n1. Reset your password...\n2. Clear browser cache...\n3. Try incognito mode...`;

  contextCapture.captureMessage(sessionId, userId, 'assistant', response);

  // 5. Index this support case for future reference
  await brainClient.indexKnowledge(
    'Login Issue Resolution - Customer 101',
    `Customer reported login issues. Resolved by clearing browser cache and resetting password.`,
    {
      tags: ['login', 'authentication', 'resolved'],
      category: 'customer-support',
      sourceType: 'support-ticket',
      resolution: 'password-reset',
    }
  );

  // 6. Report success metrics
  await brainClient.sendLearnings({
    agentId: 'cassie',
    sessionId,
    userId,
    metrics: {
      successRate: 100,
      averageResponseTime: 800,
      userSatisfaction: 5,
      tasksCompleted: 1,
    },
    insights: [
      {
        pattern: 'Login issues often resolved by cache clearing',
        confidence: 90,
        evidence: ['session-789', 'session-756', 'session-720'],
      },
    ],
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// Example 3: Real-time Chat Integration
// ============================================

export async function chatIntegrationExample(
  agentId: string,
  agentName: string
) {
  const brainClient = getBrainClient({
    agentId,
    agentName,
    workspaceId: 'default-workspace',
  });

  const contextCapture = getAutoContextCapture({
    agentId,
    agentName,
    bufferSize: 3, // Flush every 3 messages
    flushIntervalMs: 60000, // Or every minute
  });

  /**
   * This function would be called in your agent's chat handler
   */
  async function handleChatMessage(
    sessionId: string,
    userId: string,
    userMessage: string
  ): Promise<string> {
    // 1. Capture incoming message
    contextCapture.captureMessage(sessionId, userId, 'user', userMessage);

    // 2. Query Brain for relevant knowledge
    const knowledge = await brainClient.queryKnowledge(userMessage, {
      searchType: 'hybrid',
      limit: 3,
      includeContext: true,
    });

    // 3. Use knowledge to enhance response (integrate with your LLM)
    const context = knowledge.results
      .map(r => r.content.substring(0, 200))
      .join('\n\n');

    // 4. Generate response (your LLM logic here)
    const assistantMessage = `[Generated response using context: ${context}]`;

    // 5. Capture response
    contextCapture.captureMessage(
      sessionId,
      userId,
      'assistant',
      assistantMessage
    );

    return assistantMessage;
  }

  return { handleChatMessage, brainClient, contextCapture };
}

// ============================================
// Example 4: Agent Learning Loop
// ============================================

export async function agentLearningLoopExample() {
  const brainClient = getBrainClient({
    agentId: 'dexter',
    agentName: 'Dexter',
  });

  /**
   * Periodic task: Send accumulated learnings
   * Run this every hour or at end of day
   */
  async function sendDailyLearnings() {
    // Collect metrics from your agent's session data
    const metrics = {
      successRate: 92,
      averageResponseTime: 1500,
      userSatisfaction: 4.3,
      tasksCompleted: 45,
      errorCount: 3,
      commonIssues: ['Data not found', 'Slow query performance'],
    };

    // Identify patterns
    const insights = [
      {
        pattern: 'Users ask about sales data most frequently on Mondays',
        confidence: 88,
        evidence: ['session-1', 'session-15', 'session-30'],
      },
      {
        pattern: 'Queries about financial reports take longer to process',
        confidence: 75,
        evidence: ['avg-response-time: 2500ms'],
      },
    ];

    // Send to Brain
    await brainClient.sendLearnings({
      agentId: 'dexter',
      metrics,
      insights,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Daily learnings sent to Brain AI');
  }

  // Run learning loop
  await sendDailyLearnings();
}

// ============================================
// Example 5: Agent-Specific Knowledge Space
// ============================================

export async function agentKnowledgeSpaceExample() {
  const brainClient = getBrainClient({
    agentId: 'kai',
    agentName: 'Kai',
  });

  // Index agent-specific knowledge
  const codeExamples = [
    {
      title: 'React Hook Best Practices',
      content: 'Use useEffect for side effects, useMemo for expensive calculations...',
      metadata: { tags: ['react', 'hooks', 'best-practices'], language: 'javascript' },
    },
    {
      title: 'SQL Query Optimization',
      content: 'Always use indexes on WHERE clause columns...',
      metadata: { tags: ['sql', 'optimization', 'performance'], language: 'sql' },
    },
  ];

  // Batch index
  const documentIds = await brainClient.indexKnowledgeBatch(codeExamples);
  console.log('Indexed documents:', documentIds);

  // Query agent's knowledge space
  const knowledgeSpace = await brainClient.getKnowledgeSpace();
  console.log('Knowledge Space:', {
    totalDocs: knowledgeSpace.totalDocuments,
    recentQueries: knowledgeSpace.recentQueries,
    popularTopics: knowledgeSpace.popularTopics,
  });
}

// ============================================
// Example 6: Health Check & Monitoring
// ============================================

export async function healthCheckExample() {
  const brainClient = getBrainClient({
    agentId: 'dexter',
    agentName: 'Dexter',
  });

  // Check if Brain AI is healthy
  const health = await brainClient.healthCheck();

  if (health.status === 'healthy') {
    console.log('✅ Brain AI is healthy');
  } else {
    console.warn('⚠️ Brain AI is degraded or unhealthy:', health);
  }

  console.log('Services:', health.services);
}

// ============================================
// Export all examples
// ============================================

export const examples = {
  dexterAgentExample,
  cassieAgentExample,
  chatIntegrationExample,
  agentLearningLoopExample,
  agentKnowledgeSpaceExample,
  healthCheckExample,
};
