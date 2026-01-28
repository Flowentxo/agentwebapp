# 🚀 COLLABORATION LAB V2.0 - IMPLEMENTATION PLAN
## Steve Jobs-Standard: Radical Simplicity. Maximum Magic.

---

## 📊 CURRENT STATE ANALYSIS

### What Works:
✅ Beautiful visual demo environment
✅ Clear agent differentiation (colors, avatars)
✅ Smooth animations and UX
✅ Different message types visualization
✅ Keyword-based team assembly

### What Doesn't Work:
❌ No real AI integration (template-based only)
❌ Fixed demo tasks only
❌ No user interaction during collaboration
❌ No persistence
❌ No backend integration
❌ Keyword-matching too simplistic

### User Experience Gap:
**Expected**: Type problem → Watch AI agents solve it live
**Reality**: Click demo → Watch canned animation

---

## 🎯 TRANSFORMATION ROADMAP

### Phase 1: FOUNDATION (Week 1-2)
**Goal**: Replace simulation with real AI collaboration

### Phase 2: INTELLIGENCE (Week 3-4)
**Goal**: Make agents actually smart

### Phase 3: INTERACTION (Week 5-6)
**Goal**: Enable user-agent conversation

### Phase 4: MAGIC (Week 7-8)
**Goal**: Polish until it feels like actual magic

---

## 📐 PHASE 1: FOUNDATION

### 1.1 Database Schema

```sql
-- Collaborations table
CREATE TABLE collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  task_description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'planning' | 'executing' | 'completed' | 'paused' | 'failed'

  -- Intelligence
  semantic_analysis JSONB, -- LLM analysis of task
  complexity_score INTEGER, -- 1-10
  estimated_duration INTEGER, -- seconds

  -- Results
  summary TEXT,
  success_score INTEGER, -- 0-100

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Collaboration Messages (Agent Communication)
CREATE TABLE collaboration_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE,

  -- Agent Info
  agent_id VARCHAR(50) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,

  -- Message Content
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'thought' | 'action' | 'question' | 'insight' | 'handoff' | 'user_input'

  -- AI Metadata
  llm_model VARCHAR(100), -- 'gpt-4-turbo', 'claude-3-opus', etc.
  tokens_used INTEGER,
  latency_ms INTEGER,
  confidence DECIMAL(3,2), -- 0.00-1.00

  -- Relations
  parent_message_id UUID REFERENCES collaboration_messages(id), -- for threading
  target_agent_id VARCHAR(50), -- for handoffs

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Selections (which agents were chosen and why)
CREATE TABLE collaboration_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_id UUID REFERENCES collaborations(id) ON DELETE CASCADE,
  agent_id VARCHAR(50) NOT NULL,

  -- Selection Rationale
  selection_reason TEXT,
  relevance_score DECIMAL(3,2), -- 0.00-1.00

  -- Performance
  messages_count INTEGER DEFAULT 0,
  avg_confidence DECIMAL(3,2),
  contribution_score INTEGER, -- 0-100

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_collab_user ON collaborations(user_id);
CREATE INDEX idx_collab_status ON collaborations(status);
CREATE INDEX idx_collab_created ON collaborations(created_at DESC);
CREATE INDEX idx_messages_collab ON collaboration_messages(collaboration_id, created_at);
CREATE INDEX idx_messages_agent ON collaboration_messages(agent_id);
CREATE INDEX idx_agents_collab ON collaboration_agents(collaboration_id);
```

### 1.2 Backend API Structure

```typescript
// server/routes/collaborations.ts

import { Router } from 'express';
import { CollaborationService } from '../services/CollaborationService';
import { authenticateUser } from '../middleware/auth';

const router = Router();
const collaborationService = new CollaborationService();

/**
 * POST /api/collaborations/start
 * Start a new collaboration
 */
router.post('/start', authenticateUser, async (req, res) => {
  const { taskDescription } = req.body;
  const userId = req.user.id;

  try {
    const collaboration = await collaborationService.startCollaboration(
      userId,
      taskDescription
    );

    // Return collaboration ID and initial state
    res.json({
      success: true,
      collaboration: {
        id: collaboration.id,
        status: collaboration.status,
        selectedAgents: collaboration.agents,
        estimatedDuration: collaboration.estimatedDuration
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/collaborations/:id/stream
 * Server-Sent Events stream for real-time updates
 */
router.get('/:id/stream', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    await collaborationService.streamCollaboration(id, userId, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/collaborations/:id/interact
 * Send user input during collaboration
 */
router.post('/:id/interact', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { content, targetAgentId } = req.body;
  const userId = req.user.id;

  try {
    await collaborationService.handleUserInteraction(id, userId, {
      content,
      targetAgentId
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/collaborations/:id/pause
 */
router.post('/:id/pause', authenticateUser, async (req, res) => {
  const { id } = req.params;
  await collaborationService.pauseCollaboration(id);
  res.json({ success: true });
});

/**
 * POST /api/collaborations/:id/resume
 */
router.post('/:id/resume', authenticateUser, async (req, res) => {
  const { id } = req.params;
  await collaborationService.resumeCollaboration(id);
  res.json({ success: true });
});

/**
 * GET /api/collaborations
 * List user's collaboration history
 */
router.get('/', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { status, limit = 50, offset = 0 } = req.query;

  try {
    const collaborations = await collaborationService.getUserCollaborations(
      userId,
      { status, limit, offset }
    );

    res.json({ success: true, collaborations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### 1.3 Collaboration Service

```typescript
// server/services/CollaborationService.ts

import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db';
import { collaborations, collaborationMessages, collaborationAgents } from '../db/schema';
import { EventEmitter } from 'events';

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  provider: 'openai' | 'anthropic';
  model: string;
  systemPrompt: string;
  capabilities: string[];
}

export class CollaborationService extends EventEmitter {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private activeCollaborations: Map<string, CollaborationState> = new Map();

  constructor() {
    super();
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  /**
   * Start a new collaboration
   */
  async startCollaboration(userId: string, taskDescription: string) {
    const db = getDb();

    // 1. Analyze task with LLM to understand intent
    const analysis = await this.analyzeTask(taskDescription);

    // 2. Select agents based on semantic understanding
    const selectedAgents = await this.selectAgentsIntelligently(
      taskDescription,
      analysis
    );

    // 3. Create collaboration in database
    const [collaboration] = await db
      .insert(collaborations)
      .values({
        userId,
        taskDescription,
        status: 'planning',
        semanticAnalysis: analysis,
        complexityScore: analysis.complexity,
        estimatedDuration: this.estimateDuration(analysis.complexity, selectedAgents.length)
      })
      .returning();

    // 4. Save selected agents
    await db.insert(collaborationAgents).values(
      selectedAgents.map(agent => ({
        collaborationId: collaboration.id,
        agentId: agent.id,
        selectionReason: agent.reason,
        relevanceScore: agent.relevance
      }))
    );

    // 5. Start orchestration
    this.orchestrateCollaboration(collaboration.id, selectedAgents, analysis);

    return {
      id: collaboration.id,
      status: collaboration.status,
      agents: selectedAgents,
      estimatedDuration: collaboration.estimatedDuration
    };
  }

  /**
   * Analyze task with GPT-4 to understand intent, complexity, and requirements
   */
  private async analyzeTask(taskDescription: string) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a task analysis AI. Analyze the user's task and return a JSON object with:
- intent: Primary goal (string)
- domains: Required expertise areas (array of strings)
- complexity: 1-10 scale (integer)
- requiresData: boolean
- requiresCreativity: boolean
- requiresTechnical: boolean
- requiresFinancial: boolean
- requiresLegal: boolean
- requiresCommunication: boolean
- estimatedSteps: Number of major steps (integer)
- keywords: Important terms (array of strings)`
        },
        {
          role: 'user',
          content: taskDescription
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Select agents based on semantic understanding, not just keywords
   */
  private async selectAgentsIntelligently(
    taskDescription: string,
    analysis: any
  ): Promise<Array<{ id: string; name: string; reason: string; relevance: number }>> {
    const prompt = `Given this task: "${taskDescription}"

Analysis: ${JSON.stringify(analysis, null, 2)}

Available agents:
1. Dexter - Data Analysis (analytics, metrics, patterns, insights)
2. Cassie - Customer Support (communication, empathy, problem-solving)
3. Emmie - Email/Communication (writing, messaging, outreach)
4. Kai - Technical/Code (development, debugging, implementation)
5. Lex - Legal/Compliance (contracts, regulations, risk)
6. Finn - Finance (budgets, costs, ROI, forecasting)
7. Aura - Strategy (vision, planning, coordination)
8. Nova - Innovation (creativity, ideas, design thinking)
9. Ari - Adaptive (complex problems, dynamic situations)
10. Echo - Research (knowledge, learning, information)
11. Vera - Visualization (design, UI, reports, charts)
12. Omni - Monitoring (systems, alerts, oversight)

Select 2-4 agents that would best collaborate on this task. For each, explain why they're needed.

Return JSON: { "agents": [{ "id": "dexter", "name": "Dexter", "reason": "...", "relevance": 0.95 }] }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You are an expert at agent selection for multi-agent systems.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.agents;
  }

  /**
   * Orchestrate the actual collaboration between agents
   */
  private async orchestrateCollaboration(
    collaborationId: string,
    agents: any[],
    analysis: any
  ) {
    const db = getDb();

    // Update status to executing
    await db
      .update(collaborations)
      .set({ status: 'executing', startedAt: new Date() })
      .where(eq(collaborations.id, collaborationId));

    // Get task description
    const [collab] = await db
      .select()
      .from(collaborations)
      .where(eq(collaborations.id, collaborationId));

    const taskDescription = collab.taskDescription;
    const conversationHistory: any[] = [];

    // Phase 1: Initial thoughts from each agent
    for (const agent of agents) {
      const thought = await this.generateAgentMessage(
        agent,
        taskDescription,
        conversationHistory,
        'thought'
      );

      const [message] = await db
        .insert(collaborationMessages)
        .values({
          collaborationId,
          agentId: agent.id,
          agentName: agent.name,
          content: thought.content,
          type: 'thought',
          llmModel: thought.model,
          tokensUsed: thought.tokens,
          latencyMs: thought.latency,
          confidence: thought.confidence
        })
        .returning();

      conversationHistory.push({
        agent: agent.id,
        role: 'assistant',
        content: thought.content,
        type: 'thought'
      });

      // Emit to SSE stream
      this.emit(`collaboration:${collaborationId}`, {
        type: 'message',
        message
      });

      // Adaptive delay based on complexity
      await this.adaptiveDelay(analysis.complexity);
    }

    // Phase 2: Collaborative refinement (agents respond to each other)
    const maxIterations = Math.min(5, agents.length * 2);
    for (let i = 0; i < maxIterations; i++) {
      // Select next agent to speak (based on context)
      const nextAgent = await this.selectNextSpeaker(
        agents,
        conversationHistory,
        taskDescription
      );

      const response = await this.generateAgentMessage(
        nextAgent,
        taskDescription,
        conversationHistory,
        this.determineMessageType(i, maxIterations)
      );

      const [message] = await db
        .insert(collaborationMessages)
        .values({
          collaborationId,
          agentId: nextAgent.id,
          agentName: nextAgent.name,
          content: response.content,
          type: response.type,
          llmModel: response.model,
          tokensUsed: response.tokens,
          latencyMs: response.latency,
          confidence: response.confidence
        })
        .returning();

      conversationHistory.push({
        agent: nextAgent.id,
        role: 'assistant',
        content: response.content,
        type: response.type
      });

      this.emit(`collaboration:${collaborationId}`, {
        type: 'message',
        message
      });

      // Check if agents have converged on a solution
      if (await this.hasConverged(conversationHistory)) {
        break;
      }

      await this.adaptiveDelay(analysis.complexity);
    }

    // Phase 3: Generate summary
    const summary = await this.generateSummary(conversationHistory, taskDescription);

    await db
      .update(collaborations)
      .set({
        status: 'completed',
        completedAt: new Date(),
        summary: summary.content,
        successScore: summary.score
      })
      .where(eq(collaborations.id, collaborationId));

    this.emit(`collaboration:${collaborationId}`, {
      type: 'completed',
      summary: summary.content,
      score: summary.score
    });
  }

  /**
   * Generate message from a specific agent using their LLM
   */
  private async generateAgentMessage(
    agent: any,
    taskDescription: string,
    conversationHistory: any[],
    messageType: string
  ) {
    const startTime = Date.now();

    // Build context-aware prompt
    const systemPrompt = this.getAgentSystemPrompt(agent, messageType);
    const contextPrompt = this.buildContextPrompt(
      taskDescription,
      conversationHistory,
      agent.id
    );

    // Call LLM (OpenAI or Anthropic based on agent config)
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const latency = Date.now() - startTime;
    const content = response.choices[0].message.content;

    return {
      content,
      type: messageType,
      model: response.model,
      tokens: response.usage.total_tokens,
      latency,
      confidence: this.calculateConfidence(response)
    };
  }

  /**
   * Adaptive delay based on task complexity and current load
   */
  private async adaptiveDelay(complexity: number) {
    const baseDelay = 1000; // 1 second
    const complexityMultiplier = 1 + (complexity / 10);
    const randomJitter = Math.random() * 500; // 0-500ms

    const delay = baseDelay * complexityMultiplier + randomJitter;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Select which agent should speak next based on context
   */
  private async selectNextSpeaker(
    agents: any[],
    history: any[],
    taskDescription: string
  ) {
    // Use LLM to decide who should speak next
    const recentHistory = history.slice(-5);
    const historyText = recentHistory
      .map(h => `${h.agent}: ${h.content}`)
      .join('\n');

    const prompt = `Task: ${taskDescription}

Recent conversation:
${historyText}

Available agents: ${agents.map(a => a.id).join(', ')}

Who should speak next and why? Return JSON: { "agentId": "...", "reason": "..." }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'You coordinate agent conversations.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content);
    return agents.find(a => a.id === result.agentId) || agents[0];
  }

  /**
   * Stream collaboration events via SSE
   */
  async streamCollaboration(
    collaborationId: string,
    userId: string,
    sendEvent: (event: any) => void
  ) {
    // Verify ownership
    const db = getDb();
    const [collab] = await db
      .select()
      .from(collaborations)
      .where(
        and(
          eq(collaborations.id, collaborationId),
          eq(collaborations.userId, userId)
        )
      );

    if (!collab) {
      throw new Error('Collaboration not found');
    }

    // Send existing messages
    const messages = await db
      .select()
      .from(collaborationMessages)
      .where(eq(collaborationMessages.collaborationId, collaborationId))
      .orderBy(collaborationMessages.createdAt);

    for (const message of messages) {
      sendEvent({ type: 'message', message });
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Subscribe to new events
    const handler = (event: any) => sendEvent(event);
    this.on(`collaboration:${collaborationId}`, handler);

    // Cleanup on disconnect
    return () => {
      this.off(`collaboration:${collaborationId}`, handler);
    };
  }

  // Additional helper methods...
  private getAgentSystemPrompt(agent: any, messageType: string): string {
    // Returns detailed system prompts based on agent persona and message type
    // ...
  }

  private buildContextPrompt(
    task: string,
    history: any[],
    currentAgentId: string
  ): string {
    // Builds context-aware prompt including conversation history
    // ...
  }

  private calculateConfidence(response: any): number {
    // Calculate confidence based on logprobs, response length, etc.
    return 0.85;
  }

  private determineMessageType(iteration: number, maxIterations: number): string {
    if (iteration === 0) return 'thought';
    if (iteration === maxIterations - 1) return 'insight';
    if (iteration % 3 === 0) return 'question';
    return Math.random() > 0.5 ? 'action' : 'thought';
  }

  private async hasConverged(history: any[]): Promise<boolean> {
    // Use LLM to determine if agents have reached a solution
    // ...
    return false;
  }

  private async generateSummary(history: any[], task: string) {
    // Generate final summary using GPT-4
    // ...
    return { content: 'Summary...', score: 85 };
  }

  private estimateDuration(complexity: number, agentCount: number): number {
    return (complexity * 5 + agentCount * 3) * 1000; // milliseconds
  }
}
```

---

## 🎨 PHASE 2: UI/UX TRANSFORMATION

### 2.1 New Page Structure (Apple-Style Simplicity)

```typescript
// app/(app)/agents/collaborate/page.tsx (V2)

'use client';

import { useState, useEffect, useRef } from 'react';
import { CollaborationInput } from '@/components/collaboration/CollaborationInput';
import { CollaborationView } from '@/components/collaboration/CollaborationView';
import { CollaborationHistory } from '@/components/collaboration/CollaborationHistory';
import { Sparkles } from 'lucide-react';

export default function CollaborationLabV2() {
  const [activeCollaboration, setActiveCollaboration] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Minimal */}
      <header className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-text">Collaboration Lab</h1>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            {showHistory ? 'New' : 'History'}
          </button>
        </div>
      </header>

      {/* Main Content - One focus at a time */}
      <main className="flex-1 px-8 pb-8">
        {showHistory ? (
          <CollaborationHistory
            onSelect={(collab) => {
              setActiveCollaboration(collab);
              setShowHistory(false);
            }}
          />
        ) : activeCollaboration ? (
          <CollaborationView
            collaboration={activeCollaboration}
            onClose={() => setActiveCollaboration(null)}
          />
        ) : (
          <CollaborationInput
            onStart={(collab) => setActiveCollaboration(collab)}
          />
        )}
      </main>
    </div>
  );
}
```

### 2.2 Input Component (Magic Moment)

```typescript
// components/collaboration/CollaborationInput.tsx

'use client';

import { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';
import { startCollaboration } from '@/lib/api/collaborations';

export function CollaborationInput({ onStart }) {
  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStarting) return;

    setIsStarting(true);
    try {
      const collaboration = await startCollaboration(input);
      onStart(collaboration);
    } catch (error) {
      console.error('Failed to start collaboration:', error);
      setIsStarting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-3xl">
        {/* Prompt - Clear, inviting */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 mb-6">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-4xl font-bold text-text mb-4">
            What should the team work on?
          </h2>
          <p className="text-lg text-text-muted">
            Describe your challenge. AI agents will collaborate to solve it.
          </p>
        </div>

        {/* Input - Hero element */}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Example: Create a marketing strategy for our new SaaS product launching next quarter"
            disabled={isStarting}
            className="w-full h-32 px-6 py-5 rounded-2xl border-2 border-white/10 bg-white/5 text-text placeholder-text-muted resize-none focus:outline-none focus:border-purple-500/50 transition-all disabled:opacity-50"
            autoFocus
          />

          {/* Submit Button - Only appears when input has content */}
          {input.trim() && (
            <button
              type="submit"
              disabled={isStarting}
              className="absolute bottom-5 right-5 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:shadow-2xl hover:shadow-purple-500/50 transition-all disabled:opacity-50"
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Starting...
                </span>
              ) : (
                'Start Collaboration'
              )}
            </button>
          )}
        </form>

        {/* Subtle examples - Not intrusive */}
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {[
            'Launch product',
            'Improve customer support',
            'Analyze Q4 data',
            'Design new feature'
          ].map((example) => (
            <button
              key={example}
              onClick={() => setInput(example)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-text-muted hover:bg-white/10 hover:text-text transition-all"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 2.3 Live Collaboration View

```typescript
// components/collaboration/CollaborationView.tsx

'use client';

import { useEffect, useState } from 'react';
import { useCollaborationStream } from '@/hooks/useCollaborationStream';
import { AgentBubble } from './AgentBubble';
import { CollaborationHeader } from './CollaborationHeader';
import { InteractionInput } from './InteractionInput';

export function CollaborationView({ collaboration, onClose }) {
  const { messages, status, summary, isLive } = useCollaborationStream(
    collaboration.id
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      <CollaborationHeader
        collaboration={collaboration}
        status={status}
        onClose={onClose}
      />

      {/* Messages - Auto-scroll, clean layout */}
      <div className="flex-1 overflow-y-auto space-y-4 py-8">
        {messages.map((message, index) => (
          <AgentBubble
            key={message.id}
            message={message}
            isNew={index === messages.length - 1 && isLive}
          />
        ))}

        {/* Loading state */}
        {isLive && status === 'executing' && (
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-3 text-text-muted">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className="text-sm">Agents are thinking...</span>
            </div>
          </div>
        )}

        {/* Summary when completed */}
        {status === 'completed' && summary && (
          <div className="mt-8 p-6 rounded-2xl border border-green-500/20 bg-green-500/5">
            <h3 className="text-lg font-bold text-text mb-3">Summary</h3>
            <p className="text-text-muted leading-relaxed">{summary}</p>
          </div>
        )}
      </div>

      {/* Interaction input - Only show when executing */}
      {status === 'executing' && (
        <InteractionInput collaborationId={collaboration.id} />
      )}
    </div>
  );
}
```

---

## 🧠 PHASE 3: INTELLIGENT FEATURES

### 3.1 Semantic Agent Selection (LLM-Powered)

Already implemented in `CollaborationService.selectAgentsIntelligently()`

### 3.2 Context-Aware Conversation

```typescript
// Agents can reference previous messages
private buildContextPrompt(
  task: string,
  history: any[],
  currentAgentId: string
): string {
  const recentHistory = history.slice(-5);
  const otherAgents = recentHistory.filter(h => h.agent !== currentAgentId);

  const context = `
Task: ${task}

Recent conversation:
${otherAgents.map(h => `${h.agent}: ${h.content}`).join('\n')}

Your role: ${currentAgentId}
Your turn to contribute. Consider what others have said and add your perspective.
`;

  return context;
}
```

### 3.3 Adaptive Timing

```typescript
// Smart delays based on:
// 1. Task complexity
// 2. Current system load
// 3. Message type (questions need faster responses)
// 4. Agent "thinking time" simulation

private async adaptiveDelay(complexity: number, messageType: string) {
  const baseDelays = {
    thought: 2000,
    action: 1500,
    question: 1000,
    insight: 2500,
    handoff: 1000
  };

  const baseDelay = baseDelays[messageType] || 1500;
  const complexityMultiplier = 1 + (complexity / 10);
  const loadFactor = this.getCurrentLoadFactor(); // 0.5-1.5
  const jitter = Math.random() * 500;

  const delay = (baseDelay * complexityMultiplier * loadFactor) + jitter;
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

---

## 🚀 PHASE 4: MAGIC POLISH

### 4.1 Micro-Interactions

```typescript
// Message appears with stagger effect
// Agent avatar pulses while "thinking"
// Confidence bars fill smoothly
// Completion celebration (subtle confetti)
// Status transitions feel organic

// Example: Agent avatar with thinking animation
<div className="relative">
  <AgentAvatar agent={agent} />
  {isThinking && (
    <div className="absolute -top-1 -right-1 w-3 h-3">
      <div className="w-full h-full rounded-full bg-purple-400 animate-ping" />
      <div className="absolute inset-0 w-full h-full rounded-full bg-purple-400" />
    </div>
  )}
</div>
```

### 4.2 Error Handling (The Apple Way)

```typescript
// Never show technical errors to users
// Always provide actionable next steps
// Use encouraging language

function ErrorMessage({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-amber-400" />
      </div>
      <h3 className="text-xl font-bold text-text mb-2">
        Something didn't work quite right
      </h3>
      <p className="text-text-muted mb-6 text-center max-w-md">
        The agents couldn't complete this task. This might help:
      </p>
      <div className="space-y-2 text-sm text-text-muted mb-6">
        <div>• Try rephrasing your request</div>
        <div>• Break it into smaller tasks</div>
        <div>• Check if all details are included</div>
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-3 rounded-xl bg-white/10 text-text font-medium hover:bg-white/20 transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
```

### 4.3 Progressive Enhancement

```typescript
// Start simple, add complexity gradually
// Show loading states immediately
// Render what you have while fetching more
// Never block the UI

// Example: Stream messages as they arrive
const [messages, setMessages] = useState([]);

useEffect(() => {
  const eventSource = new EventSource(`/api/collaborations/${id}/stream`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'message') {
      setMessages(prev => [...prev, data.message]);
    }
  };

  return () => eventSource.close();
}, [id]);
```

---

## 📊 SUCCESS METRICS

### User Experience Metrics:
- **Time to First Magic**: < 3 seconds from input to first agent response
- **Completion Rate**: > 90% of started collaborations complete successfully
- **User Satisfaction**: > 4.5/5 stars
- **Wow Moments**: > 80% of users say "this is magic"

### Technical Metrics:
- **Response Latency**: < 2s per agent message (P95)
- **API Uptime**: > 99.9%
- **Error Rate**: < 0.1%
- **Token Efficiency**: < 5000 tokens per collaboration average

### Business Metrics:
- **Daily Active Collaborations**: Track growth
- **User Retention**: 7-day and 30-day retention
- **Feature Usage**: Track which agent combinations are most popular
- **Upgrade Conversion**: Free to paid (if applicable)

---

## 🎯 IMPLEMENTATION PRIORITY

### Week 1-2: MVP (Must Have)
1. ✅ Database schema and migrations
2. ✅ Backend API for starting collaborations
3. ✅ LLM integration (OpenAI GPT-4)
4. ✅ Basic SSE streaming
5. ✅ New UI for input and viewing
6. ✅ Agent selection algorithm

### Week 3-4: Intelligence (Should Have)
1. ✅ Semantic task analysis
2. ✅ Context-aware agent responses
3. ✅ Adaptive timing
4. ✅ Conversation convergence detection
5. ✅ Summary generation

### Week 5-6: Interaction (Nice to Have)
1. ✅ User can send messages during collaboration
2. ✅ Pause/resume functionality
3. ✅ Agent-to-agent handoffs
4. ✅ Confidence scoring visualization

### Week 7-8: Polish (Delight Factors)
1. ✅ Micro-animations
2. ✅ Error handling UX
3. ✅ Performance optimizations
4. ✅ Accessibility improvements
5. ✅ Mobile responsive design

---

## 🔐 SECURITY & PRIVACY

### Data Protection:
- User collaborations are private by default
- Encrypt sensitive data in database
- Rate limit API endpoints
- Sanitize all user inputs

### LLM Safety:
- Content filtering on inputs and outputs
- Prompt injection prevention
- Token usage limits per user
- Cost monitoring and alerts

---

## 🧪 TESTING STRATEGY

### Unit Tests:
- Agent selection logic
- Message generation
- Context building
- Timing algorithms

### Integration Tests:
- Full collaboration flow
- SSE streaming
- Database operations
- LLM API calls (mocked)

### User Testing:
- Weekly sessions with 5-10 users
- Record sessions, watch carefully
- Measure time to first wow moment
- Collect qualitative feedback

### Load Testing:
- 100 concurrent collaborations
- 1000 req/min on API
- Database query performance
- Memory leak detection

---

## 🚀 DEPLOYMENT PLAN

### Staging Environment:
- Test all features thoroughly
- Run load tests
- Invite internal team for dogfooding

### Production Rollout:
- **Phase 1**: Beta to 100 users (Week 8)
- **Phase 2**: Open beta (Week 10)
- **Phase 3**: General availability (Week 12)

### Monitoring:
- Error tracking (Sentry)
- Performance monitoring (DataDog)
- User analytics (Mixpanel)
- LLM usage tracking (custom)

---

## 💎 THE MAGIC TEST

After implementation, test with a new user:

1. **Open the page** (5 seconds)
   - Do they understand what to do?
   - Is the input field inviting?

2. **Type their problem** (10 seconds)
   - Does autocomplete help?
   - Are examples helpful?

3. **Watch agents work** (30 seconds)
   - Do they feel the agents are "thinking"?
   - Are messages meaningful?
   - Is progress clear?

4. **See the result** (1 minute)
   - Does the summary help?
   - Do they want to try again?
   - Would they tell someone about this?

**Goal**: 90% of users say "Wow, this is magic" within 2 minutes.

---

## 🎓 STEVE JOBS PRINCIPLES CHECKLIST

Before shipping each feature:

□ **Focus**: Does this feature serve the core purpose?
□ **Simplicity**: Can we remove anything and make it better?
□ **Craft**: Would I be proud to show this?
□ **Experience**: Does it feel magical, not just functional?
□ **Performance**: Is it fast enough to feel instant?
□ **Polish**: Are the details perfect?
□ **Surprise**: Will users say "wow"?

If any answer is "no", go back and fix it.

---

## 🔄 ITERATION PROCESS

Every Friday:
1. Demo to team
2. Collect feedback
3. Measure metrics
4. Prioritize improvements
5. Ship fixes by Monday

No feature is "done" until it passes The Magic Test.

---

## 📚 DOCUMENTATION

### For Developers:
- API documentation (OpenAPI spec)
- Database schema diagrams
- Architecture decision records
- Code style guide

### For Users:
- None needed. If they need docs, we failed.
- FAQ only for edge cases
- Video demos for inspiration

---

## 🎯 FINAL GOAL

**User opens the page → Types their problem → 3 seconds later → Agents are live-solving it → User feels: "This is the future."**

No learning curve. No friction. Just magic.

---

_"People don't know what they want until you show it to them. Our job is to figure out what they're going to want before they do."_ - Steve Jobs

Let's build something insanely great.
