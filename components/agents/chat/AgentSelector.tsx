"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Bot } from 'lucide-react';
import { agentPersonas, type AgentPersona } from '@/lib/agents/personas';

// Get icon component from Lucide based on persona
import * as LucideIcons from 'lucide-react';

interface AgentSelectorProps {
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  disabled?: boolean;
}

// Map agent IDs to their icons for quick access
const agentIconMap: Record<string, keyof typeof LucideIcons> = {
  'dexter': 'BarChart3',
  'cassie': 'Headphones',
  'emmie': 'Mail',
  'aura': 'Sparkles',
  'kai': 'Code2',
  'lex': 'Scale',
  'finn': 'TrendingUp',
  'nova': 'Telescope',
  'vince': 'Video',
  'milo': 'Film',
  'ari': 'Workflow',
  'vera': 'Shield',
  'echo': 'Mic',
  'omni': 'Bot',
  'buddy': 'Wallet',
};

function getAgentIcon(agentId: string) {
  const iconName = agentIconMap[agentId];
  if (iconName && LucideIcons[iconName]) {
    const Icon = LucideIcons[iconName] as React.ComponentType<{ className?: string }>;
    return Icon;
  }
  return Bot;
}

export function AgentSelector({
  selectedAgentId,
  onSelectAgent,
  disabled = false,
}: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get active agents only
  const activeAgents = agentPersonas.filter(
    (agent) => agent.status === 'active' && agent.available !== false
  );

  // Get selected agent
  const selectedAgent = agentPersonas.find((a) => a.id === selectedAgentId) || activeAgents[0];

  // Filter agents by search
  const filteredAgents = activeAgents.filter((agent) => {
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.role.toLowerCase().includes(query) ||
      agent.specialties.some((s) => s.toLowerCase().includes(query))
    );
  });

  // Group agents by category
  const groupedAgents = filteredAgents.reduce((acc, agent) => {
    const category = agent.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(agent);
    return acc;
  }, {} as Record<string, AgentPersona[]>);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleSelectAgent = (agentId: string) => {
    onSelectAgent(agentId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const SelectedIcon = getAgentIcon(selectedAgent.id);

  const categoryLabels: Record<string, string> = {
    'data': 'Data & Analytics',
    'Data & Analytics': 'Data & Analytics',
    'support': 'Customer Support',
    'operations': 'Operations',
    'marketing': 'Marketing',
    'creative': 'Creative',
    'technical': 'Technical',
    'motion': 'Motion & Video',
    'AI & Automation': 'AI & Automation',
    'general': 'General',
  };

  return (
    <div ref={dropdownRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all
          ${isOpen
            ? 'border-primary bg-primary/10 text-text'
            : 'border-white/10 bg-card/5 text-text hover:bg-card/10'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        `}
        aria-label="Agent auswählen"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: selectedAgent.color }}
        >
          <SelectedIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="max-w-[100px] truncate">{selectedAgent.name}</span>
        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-white/10 bg-surface-2 shadow-xl">
          {/* Search Input */}
          <div className="border-b border-white/10 p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Agent suchen..."
              className="w-full rounded-md border border-white/10 bg-card/5 px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Agent List */}
          <div className="max-h-80 overflow-y-auto p-1" role="listbox">
            {Object.entries(groupedAgents).map(([category, agents]) => (
              <div key={category}>
                {/* Category Header */}
                <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-subtle">
                  {categoryLabels[category] || category}
                </div>

                {/* Agents in category */}
                {agents.map((agent) => {
                  const Icon = getAgentIcon(agent.id);
                  const isSelected = agent.id === selectedAgentId;

                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent.id)}
                      role="option"
                      aria-selected={isSelected}
                      className={`
                        flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors
                        ${isSelected
                          ? 'bg-primary/10 text-text'
                          : 'text-text-muted hover:bg-card/5 hover:text-text'
                        }
                      `}
                    >
                      {/* Agent Avatar */}
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: agent.color }}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>

                      {/* Agent Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{agent.name}</span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="truncate text-xs text-text-subtle">
                          {agent.role}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* No results */}
            {filteredAgents.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-text-subtle">
                Keine Agents gefunden
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-3 py-2 text-xs text-text-subtle">
            {activeAgents.length} Agents verfügbar
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentSelector;
