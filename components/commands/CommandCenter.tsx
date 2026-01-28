'use client';

import { useState, useRef, useEffect } from 'react';
import { parseCommand, ParsedCommand, COMMAND_TEMPLATES } from '@/lib/commands/command-parser';
import { RevolutionaryAvatar } from '@/components/agents/RevolutionaryAvatar';
import { useSoundEffects } from '@/lib/agents/sound-engine';
import {
  Search,
  Mic,
  MicOff,
  Sparkles,
  Send,
  Lightbulb,
  Zap,
  X,
  ChevronRight,
  Command
} from 'lucide-react';

interface CommandCenterProps {
  onCommandExecute?: (command: ParsedCommand) => void;
  autoFocus?: boolean;
}

export function CommandCenter({ onCommandExecute, autoFocus = false }: CommandCenterProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const sound = useSoundEffects();

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        sound.playSuccess();
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        sound.playError();
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Parse command as user types
  useEffect(() => {
    if (input.trim()) {
      const parsed = parseCommand(input);
      setParsedCommand(parsed);
      setShowSuggestions(true);
    } else {
      setParsedCommand(null);
      setShowSuggestions(false);
    }
  }, [input]);

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      alert('Voice recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      sound.playClick();
    }
  };

  const handleExecute = () => {
    if (!parsedCommand || parsedCommand.confidence === 0) return;

    sound.playAgentSelect();
    onCommandExecute?.(parsedCommand);
    setInput('');
    setParsedCommand(null);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    } else if (e.key === 'Escape') {
      setInput('');
      setShowSuggestions(false);
    }
  };

  const handleTemplateClick = (commandText: string) => {
    setInput(commandText);
    sound.playClick();
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Command Input */}
      <div className="relative">
        <div
          className="relative overflow-hidden rounded-3xl border transition-all duration-300 breathing-slow"
          style={{
            background: parsedCommand?.confidence
              ? `linear-gradient(135deg, ${parsedCommand.agents[0]?.colors.primary}08 0%, ${parsedCommand.agents[0]?.colors.secondary}05 100%)`
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.03) 100%)',
            borderColor: parsedCommand?.confidence
              ? `${parsedCommand.agents[0]?.colors.primary}30`
              : 'rgba(255, 255, 255, 0.1)',
            boxShadow: parsedCommand?.confidence
              ? `0 8px 32px ${parsedCommand.agents[0]?.colors.glow}`
              : '0 4px 24px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Input Row */}
          <div className="flex items-center gap-3 p-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full breathing-fast"
                style={{
                  background: parsedCommand?.agents[0]?.colors.gradient || 'linear-gradient(135deg, #6366f1, #a855f7)',
                }}
              >
                {isListening ? (
                  <Mic className="h-5 w-5 text-white animate-pulse" />
                ) : (
                  <Command className="h-5 w-5 text-white" />
                )}
              </div>
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Command your agents... (e.g., 'Analyze sales data')"
              className="flex-1 bg-transparent text-lg text-text placeholder-text-muted outline-none"
            />

            {/* Voice Button */}
            <button
              onClick={handleVoiceToggle}
              className={`flex-shrink-0 rounded-xl p-3 transition-all duration-300 micro-bounce ${
                isListening
                  ? 'bg-red-500 text-white'
                  : 'bg-card/10 text-text-muted hover:bg-card/20'
              }`}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* Execute Button */}
            {parsedCommand && parsedCommand.confidence > 0 && (
              <button
                onClick={handleExecute}
                className="flex-shrink-0 flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-300 micro-bounce shine-effect"
                style={{
                  background: parsedCommand.agents[0]?.colors.gradient || 'linear-gradient(135deg, #6366f1, #a855f7)',
                  boxShadow: `0 8px 24px ${parsedCommand.agents[0]?.colors.glow}`,
                }}
              >
                <Send className="h-4 w-4" />
                Execute
              </button>
            )}
          </div>

          {/* Parsed Command Preview */}
          {parsedCommand && parsedCommand.confidence > 0 && (
            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-4">
                {/* Agent Avatars */}
                <div className="flex -space-x-3">
                  {parsedCommand.agents.slice(0, 3).map((agent, index) => (
                    <div
                      key={agent.id}
                      className="breathing-fast"
                      style={{ zIndex: parsedCommand.agents.length - index, animationDelay: `${index * 0.2}s` }}
                    >
                      <RevolutionaryAvatar personality={agent} size="sm" animated={true} showGlow={false} />
                    </div>
                  ))}
                </div>

                {/* Intent & Confidence */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span className="text-sm font-bold text-text capitalize">{parsedCommand.intent}</span>
                    {/* Confidence Bar */}
                    <div className="flex-1 max-w-32 h-1 bg-card/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${parsedCommand.confidence * 100}%`,
                          background: parsedCommand.agents[0]?.colors.gradient,
                        }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">{Math.round(parsedCommand.confidence * 100)}%</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {parsedCommand.agents.map(a => a.name).join(', ')} will handle this
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {showSuggestions && parsedCommand?.suggestions && parsedCommand.suggestions.length > 0 && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-card/5 p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-text-muted">Suggestions</span>
            </div>
            <div className="space-y-2">
              {parsedCommand.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleTemplateClick(suggestion.replace('Try: ', ''))}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-muted transition-colors hover:bg-card/10 hover:text-text micro-bounce"
                >
                  <ChevronRight className="h-3 w-3" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Templates */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-text-muted">Quick Commands</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {COMMAND_TEMPLATES.slice(0, 3).map((category, catIndex) => (
            <div key={catIndex} className="rounded-xl border border-white/10 bg-card/5 p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                {category.category}
              </h4>
              <div className="space-y-1">
                {category.commands.slice(0, 2).map((cmd, cmdIndex) => (
                  <button
                    key={cmdIndex}
                    onClick={() => handleTemplateClick(cmd)}
                    className="w-full text-left text-sm text-text-muted hover:text-text transition-colors micro-bounce truncate"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
