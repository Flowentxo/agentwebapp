'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Command,
  Send,
  Loader2,
  Search,
  Sparkles,
  FileText,
  BarChart3,
  Mail,
  Calendar,
  Shield,
  TrendingUp,
  HelpCircle,
  ChevronRight,
  Bot,
  BookOpen,
} from 'lucide-react';
import type { CommandSuggestion } from './types';
import { useDashboardStore, useReadingDocuments, COMMAND_SUGGESTIONS } from '@/store/useDashboardStore';

// ============================================================================
// CONSTANTS
// ============================================================================

const COMMAND_ICONS: Record<string, React.ElementType> = {
  '/research': Search,
  '/analyze': BarChart3,
  '/audit': Shield,
  '/generate': FileText,
  '/email': Mail,
  '/schedule': Calendar,
  '/support': HelpCircle,
  '/forecast': TrendingUp,
};

const CATEGORY_COLORS: Record<string, string> = {
  Analysis: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  System: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  Content: 'text-purple-600 bg-purple-50 border-purple-200',
  Communication: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  Planning: 'text-teal-600 bg-teal-50 border-teal-200',
  Support: 'text-pink-600 bg-pink-50 border-pink-200',
  Finance: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
};

// ============================================================================
// MAIN COMMAND BAR COMPONENT
// ============================================================================

interface CommandBarProps {
  suggestions?: CommandSuggestion[];
  onCommand?: (command: string) => void;
  isProcessing?: boolean;
  useStore?: boolean; // If true, uses Zustand store directly
}

export function CommandBar({
  suggestions: externalSuggestions,
  onCommand: externalOnCommand,
  isProcessing: externalIsProcessing,
  useStore = false,
}: CommandBarProps) {
  const [command, setCommand] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [assignedAgent, setAssignedAgent] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zustand store
  const storeIsProcessing = useDashboardStore((state) => state.isProcessing);
  const executeCommand = useDashboardStore((state) => state.executeCommand);
  const agents = useDashboardStore((state) => state.agents);
  const readingDocuments = useReadingDocuments(); // Level 8: RAG context indicator

  // Use store or props based on mode
  const suggestions = externalSuggestions ?? COMMAND_SUGGESTIONS;
  const isProcessing = useStore ? storeIsProcessing : (externalIsProcessing ?? false);

  // Find the currently working agent for display
  const workingAgent = agents.find((a) => a.status === 'working');

  // Filter suggestions based on input
  const filteredSuggestions = command.startsWith('/')
    ? suggestions.filter(s =>
        s.command.toLowerCase().includes(command.toLowerCase()) ||
        s.description.toLowerCase().includes(command.toLowerCase())
      )
    : suggestions;

  // Show dropdown when focused and has suggestions
  const showDropdown = isFocused && (command === '' || command.startsWith('/')) && filteredSuggestions.length > 0;

  // Handle submit
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (command.trim() && !isProcessing) {
      if (useStore) {
        // Use Zustand store directly
        await executeCommand(command);
      } else if (externalOnCommand) {
        // Use external callback
        externalOnCommand(command);
      }
      setCommand('');
      setIsExpanded(false);
      setSelectedIndex(-1);
    }
  }, [command, isProcessing, useStore, executeCommand, externalOnCommand]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'Enter') {
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          setCommand(filteredSuggestions[selectedIndex].command + ' ');
          setSelectedIndex(-1);
          inputRef.current?.focus();
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        setIsFocused(false);
        setIsExpanded(false);
        inputRef.current?.blur();
        break;
      case 'Tab':
        if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          e.preventDefault();
          setCommand(filteredSuggestions[selectedIndex].command + ' ');
          setSelectedIndex(-1);
        }
        break;
    }
  }, [showDropdown, selectedIndex, filteredSuggestions, handleSubmit]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setIsExpanded(true);
  }, []);

  // Handle blur with delay for click events
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsFocused(false);
      setIsExpanded(false);
      setSelectedIndex(-1);
    }, 200);
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: CommandSuggestion) => {
    setCommand(suggestion.command + ' ');
    inputRef.current?.focus();
  }, []);

  // Handle quick command button click
  const handleQuickCommand = useCallback((cmd: string) => {
    setCommand(cmd + ' ');
    inputRef.current?.focus();
    setIsExpanded(true);
    setIsFocused(true);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative"
    >
      <form onSubmit={handleSubmit}>
        <motion.div
          animate={{
            scale: isExpanded ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
          className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
            isFocused
              ? 'ring-2 ring-primary/40 shadow-lg shadow-primary/10'
              : 'border-2 border-border hover:border-border'
          }`}
        >
          {/* Animated Glow Effect */}
          <motion.div
            initial={false}
            animate={{
              opacity: isFocused ? 1 : 0,
            }}
            className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5"
          />

          {/* Processing Overlay */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-card/90 backdrop-blur-sm flex items-center justify-center z-10"
              >
                <div className="flex items-center gap-3">
                  {/* Level 8: Document Reading Indicator */}
                  {readingDocuments > 0 && (
                    <div className="flex items-center gap-2 mr-3 px-3 py-1.5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30">
                      <BookOpen className="w-4 h-4 text-emerald-500 animate-pulse" />
                      <span className="text-xs text-emerald-500 font-medium">
                        Reading {readingDocuments} document{readingDocuments > 1 ? 's' : ''}...
                      </span>
                    </div>
                  )}
                  {workingAgent ? (
                    <>
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center animate-pulse"
                        style={{ backgroundColor: `${workingAgent.color}20` }}
                      >
                        <Bot className="w-4 h-4" style={{ color: workingAgent.color }} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground font-medium">{workingAgent.name} is working...</span>
                        <span className="text-xs text-muted-foreground">{workingAgent.currentTask}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-sm text-primary font-medium">Processing command...</span>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative flex items-center bg-card backdrop-blur-xl">
            {/* Command Icon */}
            <div className="flex items-center gap-2 pl-5 pr-3 py-4">
              <motion.div
                animate={{ rotate: isFocused ? 360 : 0 }}
                transition={{ duration: 0.5 }}
              >
                {command.startsWith('/') ? (
                  <Sparkles className="w-5 h-5 text-primary" />
                ) : (
                  <Command className="w-5 h-5 text-muted-foreground" />
                )}
              </motion.div>
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
                {command.startsWith('/') ? 'CMD' : 'ASK'}
              </span>
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="What should the agents work on? Try /research, /analyze, /generate..."
              className="flex-1 bg-transparent py-4 pr-4 text-foreground placeholder-slate-400 focus:outline-none text-base"
              disabled={isProcessing}
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!command.trim() || isProcessing}
              className={`flex items-center gap-2 mr-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                command.trim() && !isProcessing
                  ? 'bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/25'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Execute</span>
            </button>
          </div>
        </motion.div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-2 max-h-[300px] overflow-y-auto">
                {filteredSuggestions.map((suggestion, index) => {
                  const Icon = COMMAND_ICONS[suggestion.command] || Sparkles;
                  const categoryStyle = CATEGORY_COLORS[suggestion.category || ''] || 'text-muted-foreground bg-muted/50 border-border';
                  const isSelected = index === selectedIndex;

                  return (
                    <motion.button
                      key={suggestion.command}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-primary/5 border-2 border-primary/20'
                          : 'hover:bg-muted/50 border-2 border-transparent'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {suggestion.command}
                          </span>
                          {suggestion.category && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${categoryStyle}`}>
                              {suggestion.category}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{suggestion.description}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </motion.button>
                  );
                })}
              </div>

              {/* Keyboard Hints */}
              <div className="px-4 py-2 border-t-2 border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span><kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">↑↓</kbd> navigate</span>
                  <span><kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">Tab</kbd> autocomplete</span>
                  <span><kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">Enter</kbd> select</span>
                </div>
                <span><kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">Esc</kbd> close</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Quick Command Hints */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-2 mt-3 px-1"
      >
        {['/research', '/analyze', '/generate', '/email'].map((cmd) => {
          const Icon = COMMAND_ICONS[cmd] || Sparkles;
          return (
            <button
              key={cmd}
              onClick={() => handleQuickCommand(cmd)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border-2 border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-all group"
            >
              <Icon className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
              {cmd}
            </button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

export default CommandBar;
