'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  X,
  Zap,
  Clock,
  Settings,
  Users,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { getAgentById, getAllAgents } from '@/lib/agents/personas';

interface RadicalCommandCenterProps {
  currentAgentId?: string;
}

export function RadicalCommandCenter({ currentAgentId }: RadicalCommandCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Keyboard Shortcut: Cmd/Ctrl + B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const currentAgent = currentAgentId ? getAgentById(currentAgentId) : null;

  // Quick Actions
  const quickActions = [
    {
      label: 'New Chat',
      icon: Zap,
      action: () => {
        router.push('/agents/browse');
        setIsOpen(false);
      }
    },
    {
      label: 'Recent',
      icon: Clock,
      action: () => {
        router.push('/inbox');
        setIsOpen(false);
      }
    },
    {
      label: 'Settings',
      icon: Settings,
      action: () => {
        router.push('/settings');
        setIsOpen(false);
      }
    }
  ];

  return (
    <>
      {/* FLOATING ACTION BUTTON - Always Visible */}
      <button
        onClick={() => setIsOpen(true)}
        className="radical-fab"
        aria-label="Command Center"
        title="Command Center (⌘+B)"
      >
        <Command size={20} />
      </button>

      {/* BACKDROP */}
      {isOpen && (
        <div
          className="radical-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* COMMAND CENTER SIDEBAR */}
      <aside className={`radical-command-center ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <header className="radical-cc-header">
          <div className="radical-cc-title">
            <Command size={20} />
            <span>Command Center</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="radical-cc-close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Current Agent */}
        {currentAgent && (
          <div className="radical-cc-section">
            <div className="radical-cc-label">Current Agent</div>
            <div
              className="radical-current-agent"
              style={{
                background: `linear-gradient(135deg, ${currentAgent.color}15, ${currentAgent.color}25)`,
                borderColor: `${currentAgent.color}40`
              }}
            >
              <div
                className="radical-current-agent-icon"
                style={{ color: currentAgent.color }}
              >
                <currentAgent.icon size={20} />
              </div>
              <div className="radical-current-agent-info">
                <div className="radical-current-agent-name">
                  {currentAgent.name}
                </div>
                <div className="radical-current-agent-role">
                  {currentAgent.role}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="radical-cc-section">
          <div className="radical-cc-label">Quick Actions</div>
          <div className="radical-quick-actions">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="radical-quick-action"
                >
                  <Icon size={18} />
                  <span>{action.label}</span>
                  <ChevronRight size={16} className="radical-action-arrow" />
                </button>
              );
            })}
          </div>
        </div>

        {/* All Agents */}
        <div className="radical-cc-section radical-cc-agents">
          <div className="radical-cc-label">Switch Agent</div>
          <div className="radical-agents-grid">
            {getAllAgents().slice(0, 6).map((agent) => {
              const Icon = agent.icon;
              const isActive = currentAgentId === agent.id;

              return (
                <button
                  key={agent.id}
                  onClick={() => {
                    router.push(`/agents/${agent.id}/chat`);
                    setIsOpen(false);
                  }}
                  className={`radical-agent-card ${isActive ? 'active' : ''}`}
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${agent.color}20, ${agent.color}30)`
                      : undefined,
                    borderColor: isActive ? `${agent.color}60` : undefined
                  }}
                >
                  <div
                    className="radical-agent-card-icon"
                    style={{ color: agent.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="radical-agent-card-name">{agent.name}</div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              router.push('/agents/browse');
              setIsOpen(false);
            }}
            className="radical-view-all"
          >
            <Users size={16} />
            View All Agents
          </button>
        </div>

        {/* Footer */}
        <footer className="radical-cc-footer">
          <button className="radical-cc-logout">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <div className="radical-cc-shortcut">
            <kbd>⌘</kbd> + <kbd>B</kbd>
          </div>
        </footer>
      </aside>
    </>
  );
}
