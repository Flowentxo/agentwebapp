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
    <div className="space-y-3 border-t border-white/6 bg-surface-1 p-4">
      {/* Quick Prompts */}
      {quickPrompts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => selectQuickPrompt(prompt)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-card/5 px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-card/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {prompt.icon && <span>{prompt.icon}</span>}
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      {/* Slash Commands Dropdown */}
      {showSlashCommands && filteredCommands.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-surface-2 shadow-lg">
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredCommands.map((command, index) => {
              const isSelected = index === selectedCommandIndex;

              return (
                <button
                  key={command.command}
                  onClick={() => selectSlashCommand(command)}
                  className={`
                    flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors
                    ${
                      isSelected
                        ? 'bg-card/10 text-text'
                        : 'text-text-muted hover:bg-card/5 hover:text-text'
                    }
                  `}
                >
                  <Terminal className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">/{command.command}</div>
                    <div className="text-xs text-text-subtle">
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-subtle">Agent:</span>
          <AgentSelector
            selectedAgentId={currentAgentId}
            onSelectAgent={handleAgentChange}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Composer */}
      <div className="flex items-end gap-2">
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
                  rounded-lg border p-2 transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-white/10 bg-card/5 text-text-muted hover:bg-card/10 hover:text-text'
                  }
                `}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Input with toolbar */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            rows={1}
            disabled={isLoading}
            className="w-full resize-none rounded-lg border border-white/10 bg-card/5 px-4 py-3 pb-10 text-sm text-text placeholder:text-text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '200px' }}
          />

          {/* Toolbar at bottom of textarea */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {/* TODO: Implement attachment */}}
              aria-label="Anhang hinzufügen"
              title="Anhang hinzufügen"
              className="rounded p-1.5 text-text-subtle transition-colors hover:bg-card/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {/* TODO: Implement data source picker */}}
              aria-label="Datenquelle wählen"
              title="Datenquelle wählen"
              className="rounded p-1.5 text-text-subtle transition-colors hover:bg-card/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Database className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          aria-label="Nachricht senden"
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Helper Text */}
      <div className="flex items-center justify-between text-xs text-text-subtle">
        <span>
          <kbd className="inline-flex h-5 items-center rounded border border-white/10 bg-card/5 px-1.5 font-mono">
            Enter
          </kbd>{' '}
          senden ·{' '}
          <kbd className="inline-flex h-5 items-center rounded border border-white/10 bg-card/5 px-1.5 font-mono">
            Shift+Enter
          </kbd>{' '}
          neue Zeile
        </span>
        <span className="capitalize">{modes.find((m) => m.value === mode)?.label}</span>
      </div>
    </div>
  );
}
