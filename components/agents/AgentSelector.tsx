'use client';

/**
 * AGENT SELECTOR
 *
 * Dropdown to switch between built-in and custom agents in chat
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Bot, Sparkles, Plus } from 'lucide-react';
import { agentPersonas, type AgentPersona } from '@/lib/agents/personas';

interface CustomAgent {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: 'draft' | 'active' | 'archived';
}

interface AgentSelectorProps {
  currentAgentId: string;
  currentAgent: AgentPersona | null;
}

export function AgentSelector({ currentAgentId, currentAgent }: AgentSelectorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomAgents();
  }, []);

  const loadCustomAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/agents/custom?status=active');
      const result = await response.json();

      if (result.success) {
        setCustomAgents(result.data);
      }
    } catch (error) {
      console.error('Failed to load custom agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAgent = (agentId: string) => {
    router.push(`/agents/${agentId}/chat`);
    setIsOpen(false);
  };

  if (!currentAgent) return null;

  return (
    <div className="relative">
      {/* Current Agent Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-surface transition-colors border border-border"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: currentAgent.color }}
        >
          {typeof currentAgent.icon === 'string' ? currentAgent.icon : <Bot className="h-5 w-5 text-white" />}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-text">{currentAgent.name}</p>
          <p className="text-xs text-text-muted">{currentAgent.role}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-surface shadow-xl max-h-[400px] overflow-y-auto">
            {/* Built-in Agents */}
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-text-muted">
                Built-in Agents
              </div>
              {agentPersonas.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors ${
                    currentAgentId === agent.id ? 'bg-primary/10 border border-primary/20' : ''
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: agent.color }}
                  >
                    {typeof agent.icon === 'string' ? (
                      <span className="text-lg">{agent.icon}</span>
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-text">{agent.name}</p>
                    <p className="text-xs text-text-muted truncate">{agent.role}</p>
                  </div>
                  {currentAgentId === agent.id && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Agents */}
            {customAgents.length > 0 && (
              <>
                <div className="border-t border-border my-2" />
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-medium text-text-muted flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    My Custom Agents
                  </div>
                  {customAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors ${
                        currentAgentId === agent.id ? 'bg-primary/10 border border-primary/20' : ''
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: agent.color }}
                      >
                        {agent.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-text">{agent.name}</p>
                      </div>
                      {currentAgentId === agent.id && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Create New Agent */}
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  router.push('/agents/studio/create');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium">Create New Agent</p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
