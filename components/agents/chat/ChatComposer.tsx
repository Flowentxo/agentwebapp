"use client";

import { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageCircle,
  Terminal,
  Settings,
  Loader2,
  Paperclip,
  Database,
} from 'lucide-react';
import { type ComposerMode, type QuickPrompt, type SlashCommand } from './types';
import { AgentSelector } from './AgentSelector';

interface ChatComposerProps {
  onSend: (message: string, mode: ComposerMode, agentId?: string) => void;
  quickPrompts?: QuickPrompt[];
  slashCommands?: SlashCommand[];
  isLoading?: boolean;
  placeholder?: string;
  /** Currently selected agent ID */
  selectedAgentId?: string;
  /** Callback when agent selection changes */
  onAgentChange?: (agentId: string) => void;
  /** Whether to show the agent selector */
  showAgentSelector?: boolean;
}

const modes: { value: ComposerMode; label: string; icon: typeof MessageCircle }[] = [
  { value: 'question', label: 'Frage', icon: MessageCircle },
  { value: 'command', label: 'Befehl', icon: Terminal },
  { value: 'system-hint', label: 'System', icon: Settings },
];

export function ChatComposer({
  onSend,
  quickPrompts = [],
  slashCommands = [],
  isLoading = false,
  placeholder,
  selectedAgentId = 'dexter',
  onAgentChange,
  showAgentSelector = true,
}: ChatComposerProps) {
  const [mode, setMode] = useState<ComposerMode>('question');
  const [message, setMessage] = useState('');
  const [currentAgentId, setCurrentAgentId] = useState(selectedAgentId);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Handle slash commands
  useEffect(() => {
    const words = message.trim().split(' ');
    const firstWord = words[0];

    if (firstWord.startsWith('/') && slashCommands.length > 0) {
      const query = firstWord.substring(1).toLowerCase();
      const filtered = slashCommands.filter((cmd) =>
        cmd.command.toLowerCase().includes(query)
      );
      setFilteredCommands(filtered);
      setShowSlashCommands(filtered.length > 0);
      setSelectedCommandIndex(0);
    } else {
      setShowSlashCommands(false);
    }
  }, [message, slashCommands]);

  // Sync with prop changes
  useEffect(() => {
    setCurrentAgentId(selectedAgentId);
  }, [selectedAgentId]);

  const handleAgentChange = (agentId: string) => {
    setCurrentAgentId(agentId);
    onAgentChange?.(agentId);
  };

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim(), mode, currentAgentId);
      setMessage('');
      setShowSlashCommands(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    if (showSlashCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && filteredCommands[selectedCommandIndex]) {
        e.preventDefault();
        selectSlashCommand(filteredCommands[selectedCommandIndex]);
      } else if (e.key === 'Escape') {
        setShowSlashCommands(false);
      }
    }
  };

  const selectSlashCommand = (command: SlashCommand) => {
    const args = command.args ? ` ${command.args.join(' ')}` : '';
    setMessage(`/${command.command}${args}`);
    setShowSlashCommands(false);
    textareaRef.current?.focus();
  };

  const selectQuickPrompt = (prompt: QuickPrompt) => {
    setMessage(prompt.prompt);
    textareaRef.current?.focus();
  };

  const placeholderText = placeholder || {
    question: 'Stelle eine Frage...',
    command: 'Gib einen Befehl ein (/deploy, /log, etc.)...',
    'system-hint': 'System-Hinweis oder Persona anpassen...',
  }[mode];

  return (
    <div className="space-y-3 px-6 pb-5 pt-3">
      {/* Quick Prompts */}
      {quickPrompts.length > 0 && (
        <div className="mx-auto max-w-3xl flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => selectQuickPrompt(prompt)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70 focus-visible:outline-none"
            >
              {prompt.icon && <span>{prompt.icon}</span>}
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      {/* Slash Commands Dropdown */}
      {showSlashCommands && filteredCommands.length > 0 && (
        <div className="mx-auto max-w-3xl rounded-xl border border-white/[0.08] bg-[#171717] shadow-lg backdrop-blur-xl">
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredCommands.map((command, index) => {
              const isSelected = index === selectedCommandIndex;

              return (
                <button
                  key={command.command}
                  onClick={() => selectSlashCommand(command)}
                  className={`
                    flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors
                    ${
                      isSelected
                        ? 'bg-white/[0.06] text-white'
                        : 'text-white/50 hover:bg-white/[0.04] hover:text-white/70'
                    }
                  `}
                >
                  <Terminal className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">/{command.command}</div>
                    <div className="text-xs text-white/30">
                      {command.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Agent Selector Row */}
      {showAgentSelector && (
        <div className="mx-auto max-w-3xl flex items-center gap-2">
          <span className="text-xs text-white/30">Agent:</span>
          <AgentSelector
            selectedAgentId={currentAgentId}
            onSelectAgent={handleAgentChange}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Composer Capsule */}
      <div
        className="mx-auto max-w-3xl flex items-end gap-2 rounded-2xl p-3 px-4 transition-all border border-white/[0.08] focus-within:border-violet-500/30 focus-within:ring-1 focus-within:ring-violet-500/10"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(40px)',
        }}
      >
        {/* Mode Switcher */}
        <div className="flex flex-col gap-1">
          {modes.map(({ value, label, icon: Icon }) => {
            const isActive = mode === value;

            return (
              <button
                key={value}
                onClick={() => setMode(value)}
                aria-label={`Modus: ${label}`}
                aria-pressed={isActive}
                className={`
                  rounded-lg p-1.5 transition-colors
                  focus-visible:outline-none
                  ${
                    isActive
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'text-white/20 hover:bg-white/[0.06] hover:text-white/50'
                  }
                `}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Input area */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            rows={1}
            disabled={isLoading}
            className="w-full resize-none bg-transparent px-3 py-2.5 text-sm text-white/90 placeholder:text-white/15 focus:outline-none disabled:opacity-50"
            style={{ minHeight: '40px', maxHeight: '160px' }}
          />
        </div>

        {/* Toolbar buttons */}
        <button
          type="button"
          onClick={() => {/* TODO: Implement attachment */}}
          aria-label="Anhang hinzufügen"
          title="Anhang hinzufügen"
          className="p-2 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {/* TODO: Implement data source picker */}}
          aria-label="Datenquelle wählen"
          title="Datenquelle wählen"
          className="p-2 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
        >
          <Database className="h-4 w-4" />
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          aria-label="Nachricht senden"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-500 text-white transition-all hover:bg-violet-400 focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            boxShadow: (!message.trim() || isLoading)
              ? 'none'
              : '0 0 16px rgba(139, 92, 246, 0.3)',
          }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Helper Text */}
      <div className="mx-auto max-w-3xl flex items-center justify-between text-[10px] text-white/20 px-1">
        <span>
          <kbd className="inline-flex h-4 items-center rounded border border-white/[0.08] bg-white/[0.03] px-1 font-mono text-[10px]">
            Enter
          </kbd>{' '}
          senden ·{' '}
          <kbd className="inline-flex h-4 items-center rounded border border-white/[0.08] bg-white/[0.03] px-1 font-mono text-[10px]">
            Shift+Enter
          </kbd>{' '}
          neue Zeile
        </span>
        <span className="capitalize">{modes.find((m) => m.value === mode)?.label}</span>
      </div>
    </div>
  );
}
