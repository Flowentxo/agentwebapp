/**
 * AGENT BUILDER PAGE
 *
 * OpenAI GPT Builder style interface for creating custom agents
 */

import { AgentBuilder } from '@/components/agents/AgentBuilder';

export const metadata = {
  title: 'Create Custom Agent - Flowent AI',
  description: 'Build your own AI agent with custom instructions, knowledge, and actions',
};

export default function CreateAgentPage() {
  return (
    <div className="h-screen overflow-hidden">
      <AgentBuilder />
    </div>
  );
}
