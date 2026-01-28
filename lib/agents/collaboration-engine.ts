/**
 * REVOLUTIONARY COLLABORATION ENGINE
 *
 * Make agent interactions visible and meaningful.
 * Agents don't work in silos - they collaborate.
 */

import { AgentPersonality, REVOLUTIONARY_PERSONAS } from './personas-revolutionary';

export interface AgentMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
  type: 'thought' | 'action' | 'question' | 'insight' | 'handoff';
  targetAgentId?: string; // For handoffs
  metadata?: {
    confidence?: number;
    relevance?: string[];
    tags?: string[];
  };
}

export interface Collaboration {
  id: string;
  taskDescription: string;
  involvedAgents: string[]; // Agent IDs
  messages: AgentMessage[];
  status: 'planning' | 'executing' | 'debating' | 'completed' | 'paused' | 'failed';
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Determine which agents should collaborate on a task
 */
export function assembleAgentTeam(taskDescription: string): AgentPersonality[] {
  const task = taskDescription.toLowerCase();
  const selectedAgents: AgentPersonality[] = [];

  // Data analysis task
  if (task.includes('data') || task.includes('analytics') || task.includes('metrics')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.dexter);
  }

  // Customer-facing task
  if (task.includes('customer') || task.includes('support') || task.includes('inquiry')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.cassie);
  }

  // Communication/Email task
  if (task.includes('email') || task.includes('message') || task.includes('communication')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.emmie);
  }

  // Code/Technical task
  if (task.includes('code') || task.includes('bug') || task.includes('develop') || task.includes('technical')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.kai);
  }

  // Legal/Compliance task
  if (task.includes('legal') || task.includes('contract') || task.includes('compliance')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.lex);
  }

  // Financial task
  if (task.includes('finance') || task.includes('budget') || task.includes('cost') || task.includes('revenue')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.finn);
  }

  // Strategic/Vision task
  if (task.includes('strategy') || task.includes('vision') || task.includes('roadmap') || task.includes('future')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.aura);
  }

  // Innovation/Creative task
  if (task.includes('innovation') || task.includes('creative') || task.includes('new idea')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.nova);
  }

  // Adaptive/Complex task
  if (task.includes('adapt') || task.includes('complex') || task.includes('dynamic')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.ari);
  }

  // Research/Knowledge task
  if (task.includes('research') || task.includes('knowledge') || task.includes('learn')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.echo);
  }

  // Visualization/Design task
  if (task.includes('visual') || task.includes('design') || task.includes('ui') || task.includes('report')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.vera);
  }

  // Monitoring/System task
  if (task.includes('monitor') || task.includes('system') || task.includes('watch') || task.includes('alert')) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.omni);
  }

  // Always include at least one agent
  if (selectedAgents.length === 0) {
    selectedAgents.push(REVOLUTIONARY_PERSONAS.aura); // Default: Strategic commander
  }

  return selectedAgents;
}

/**
 * Generate agent collaboration message based on personality
 */
export function generateAgentThought(
  agent: AgentPersonality,
  context: string,
  messageType: AgentMessage['type'] = 'thought'
): string {
  const templates = {
    thought: {
      dexter: [
        `Looking at the data, I see ${context}`,
        `The metrics indicate ${context}`,
        `Analyzing patterns: ${context}`
      ],
      cassie: [
        `From a customer perspective, ${context}`,
        `I want to make sure we address ${context}`,
        `Let's focus on ${context} for the best experience`
      ],
      emmie: [
        `I'll craft a message about ${context}`,
        `Communication-wise, we should highlight ${context}`,
        `Let me draft something that covers ${context}`
      ],
      kai: [
        `Technically speaking, ${context}`,
        `The code needs to handle ${context}`,
        `I can implement ${context}`
      ],
      lex: [
        `From a legal standpoint, ${context}`,
        `We need to ensure compliance with ${context}`,
        `The contract should address ${context}`
      ],
      finn: [
        `Financially, ${context}`,
        `Looking at the budget, ${context}`,
        `The ROI depends on ${context}`
      ],
      aura: [
        `Strategically, ${context}`,
        `Our vision requires ${context}`,
        `The roadmap should include ${context}`
      ],
      nova: [
        `What if we tried ${context}?`,
        `I'm envisioning ${context}`,
        `Innovation requires ${context}`
      ],
      ari: [
        `Adapting to ${context}`,
        `This situation calls for ${context}`,
        `I can adjust to ${context}`
      ],
      echo: [
        `My research shows ${context}`,
        `The knowledge base indicates ${context}`,
        `Historical data suggests ${context}`
      ],
      vera: [
        `Visually, ${context}`,
        `The design should reflect ${context}`,
        `I'll create something that shows ${context}`
      ],
      omni: [
        `Monitoring ${context}`,
        `System check: ${context}`,
        `I'm watching ${context}`
      ]
    },
    action: {
      dexter: `Analyzing ${context}`,
      cassie: `Handling ${context}`,
      emmie: `Crafting ${context}`,
      kai: `Implementing ${context}`,
      lex: `Reviewing ${context}`,
      finn: `Calculating ${context}`,
      aura: `Orchestrating ${context}`,
      nova: `Innovating ${context}`,
      ari: `Adapting ${context}`,
      echo: `Researching ${context}`,
      vera: `Visualizing ${context}`,
      omni: `Monitoring ${context}`
    },
    question: {
      dexter: `What does the data say about ${context}?`,
      cassie: `How can we help the customer with ${context}?`,
      emmie: `What's the best way to communicate ${context}?`,
      kai: `How should we code ${context}?`,
      lex: `Is ${context} compliant?`,
      finn: `What's the cost of ${context}?`,
      aura: `How does ${context} align with our strategy?`,
      nova: `What if we reimagined ${context}?`,
      ari: `How can we adapt ${context}?`,
      echo: `What does the knowledge base say about ${context}?`,
      vera: `How should we visualize ${context}?`,
      omni: `What's the system status for ${context}?`
    },
    insight: {
      dexter: `Key insight: ${context}`,
      cassie: `Customer insight: ${context}`,
      emmie: `Communication insight: ${context}`,
      kai: `Technical insight: ${context}`,
      lex: `Legal insight: ${context}`,
      finn: `Financial insight: ${context}`,
      aura: `Strategic insight: ${context}`,
      nova: `Innovation opportunity: ${context}`,
      ari: `Adaptive insight: ${context}`,
      echo: `Research finding: ${context}`,
      vera: `Visual insight: ${context}`,
      omni: `System insight: ${context}`
    },
    handoff: {
      dexter: `Based on my analysis, @{target} should handle ${context}`,
      cassie: `@{target}, the customer needs your expertise on ${context}`,
      emmie: `@{target}, I'll need your input for ${context}`,
      kai: `@{target}, can you review ${context}?`,
      lex: `@{target}, your expertise is needed for ${context}`,
      finn: `@{target}, this impacts your area: ${context}`,
      aura: `@{target}, I'm delegating ${context} to you`,
      nova: `@{target}, you'd be perfect for ${context}`,
      ari: `@{target}, let's collaborate on ${context}`,
      echo: `@{target}, my research suggests you handle ${context}`,
      vera: `@{target}, I'll visualize ${context} once you provide input`,
      omni: `Alert: @{target} should address ${context}`
    }
  };

  // Safety check: ensure messageType exists in templates
  const templateCategory = templates[messageType] || templates.thought;
  const agentTemplates = templateCategory[agent.id as keyof typeof templates.thought];

  if (Array.isArray(agentTemplates)) {
    const randomIndex = Math.floor(Math.random() * agentTemplates.length);
    return agentTemplates[randomIndex];
  }

  return agentTemplates || `${agent.name}: ${context}`;
}

/**
 * Simulate agent collaboration on a task
 */
export function simulateCollaboration(
  taskDescription: string,
  durationMs: number = 5000
): Collaboration {
  const team = assembleAgentTeam(taskDescription);
  const collaboration: Collaboration = {
    id: `collab-${Date.now()}`,
    taskDescription,
    involvedAgents: team.map(a => a.id),
    messages: [],
    status: 'planning',
    startedAt: new Date()
  };

  // Initial thoughts from each agent
  team.forEach((agent, index) => {
    setTimeout(() => {
      const message: AgentMessage = {
        id: `msg-${Date.now()}-${index}`,
        agentId: agent.id,
        content: generateAgentThought(agent, taskDescription, 'thought'),
        timestamp: new Date(),
        type: 'thought',
        metadata: {
          confidence: 0.7 + Math.random() * 0.3
        }
      };
      collaboration.messages.push(message);
    }, index * 500);
  });

  return collaboration;
}

/**
 * Get agent collaboration insights
 */
export function getCollaborationInsights(collaboration: Collaboration): {
  efficiency: number;
  coverage: number;
  synergy: string;
  recommendation: string;
} {
  const agentCount = collaboration.involvedAgents.length;
  const messageCount = collaboration.messages.length;

  return {
    efficiency: Math.min(100, (messageCount / agentCount) * 20),
    coverage: Math.min(100, agentCount * 15),
    synergy: agentCount > 3 ? 'high' : agentCount > 1 ? 'medium' : 'low',
    recommendation: agentCount < 2
      ? 'Consider involving more agents for better coverage'
      : agentCount > 5
        ? 'Large team - ensure clear coordination'
        : 'Optimal team size for this task'
  };
}
