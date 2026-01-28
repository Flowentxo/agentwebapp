'use client';

import { AgentPersona } from '@/lib/agents/personas';
import {
  ChevronLeft,
  MoreVertical,
  Trash2,
  Download,
  Settings,
  RefreshCw,
  Zap,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface ChatHeaderProps {
  agent: AgentPersona;
  onClearHistory?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  isStreaming?: boolean;
}

export function ChatHeader({
  agent,
  onClearHistory,
  onExport,
  onSettings,
  isStreaming = false
}: ChatHeaderProps) {
  const Icon = agent.icon;
  const [showMenu, setShowMenu] = useState(false);
  const [latency, setLatency] = useState<number>(0);
  const [modelInfo] = useState('GPT-4 Turbo');

  useEffect(() => {
    // Simulate latency measurement
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 50) + 20);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearHistory = () => {
    if (window.confirm(`Clear all chat history with ${agent.name}?`)) {
      onClearHistory?.();
      setShowMenu(false);
    }
  };

  const handleExport = () => {
    onExport?.();
    setShowMenu(false);
  };

  const handleSettings = () => {
    onSettings?.();
    setShowMenu(false);
  };

  return (
    <div className="chat-header-sticky">
      <div className="chat-header-content">
        <Link href="/agents/browse" className="back-button-compact">
          <ChevronLeft size={18} />
        </Link>

        <div className="agent-info-compact">
          <div
            className="agent-avatar-compact"
            style={{
              background: `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)`,
              boxShadow: `0 2px 8px ${agent.color}40`
            }}
          >
            <Icon size={18} />
          </div>
          <div className="agent-details-compact">
            <h2 className="agent-name-compact">{agent.name}</h2>
            <div className="agent-meta">
              <span className="agent-role-badge">{agent.role}</span>
              <span className="model-badge">
                <Zap size={12} />
                {modelInfo}
              </span>
              <span className={`latency-badge ${latency < 50 ? 'good' : latency < 100 ? 'medium' : 'slow'}`}>
                <Activity size={12} />
                {latency}ms
              </span>
              {isStreaming && (
                <span className="streaming-badge">
                  <span className="streaming-dot"></span>
                  Streaming
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="action-button-compact"
            onClick={handleClearHistory}
            aria-label="Reset Chat"
            title="Reset Chat"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="action-button-compact"
            onClick={handleExport}
            aria-label="Export Chat"
            title="Export Chat"
          >
            <Download size={16} />
          </button>
          <button
            className="action-button-compact"
            onClick={handleSettings}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} />
          </button>
          <div className="menu-container-compact">
            <button
              className="action-button-compact"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="More Options"
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <>
                <div
                  className="menu-overlay"
                  onClick={() => setShowMenu(false)}
                />
                <div className="menu-dropdown-compact">
                  <button
                    className="menu-item"
                    onClick={handleClearHistory}
                  >
                    <RefreshCw size={14} />
                    Reset Conversation
                  </button>
                  <button
                    className="menu-item"
                    onClick={handleExport}
                  >
                    <Download size={14} />
                    Export as JSON
                  </button>
                  <button
                    className="menu-item"
                    onClick={handleSettings}
                  >
                    <Settings size={14} />
                    Chat Settings
                  </button>
                  <div className="menu-divider" />
                  <button
                    className="menu-item danger"
                    onClick={handleClearHistory}
                  >
                    <Trash2 size={14} />
                    Clear All History
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
