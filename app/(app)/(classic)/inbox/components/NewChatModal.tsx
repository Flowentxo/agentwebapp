'use client';

/**
 * NewChatModal - Agent Selection Modal for New Conversations
 *
 * Horizon-Dark style modal with glassmorphism effects.
 * Features:
 * - Grid of all 15 agents with icons and colors
 * - Search functionality
 * - Category filtering
 * - Keyboard navigation
 * - Loading state during thread creation
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Root as DialogRoot,
  Portal as DialogPortal,
  Overlay as DialogOverlay,
  Content as DialogContent,
  Title as DialogTitle,
  Description as DialogDescription,
  Close as DialogClose,
} from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Loader2,
  Sparkles,
  MessageSquarePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AgentPersona,
  agentPersonas,
  getActiveAgents,
} from '@/lib/agents/personas';
import { useCreateThread } from '@/lib/hooks/useInbox';

interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThreadCreated?: (threadId: string) => void;
}

// Category definitions
const CATEGORIES = [
  { id: 'all', label: 'Alle' },
  { id: 'data', label: 'Daten' },
  { id: 'support', label: 'Support' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'technical', label: 'Technik' },
  { id: 'operations', label: 'Betrieb' },
  { id: 'creative', label: 'Kreativ' },
  { id: 'motion', label: 'Motion' },
  { id: 'AI & Automation', label: 'KI' },
] as const;

export function NewChatModal({
  open,
  onOpenChange,
  onThreadCreated,
}: NewChatModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const createThreadMutation = useCreateThread();

  // Get filtered agents
  const filteredAgents = useMemo(() => {
    let agents = getActiveAgents();

    // Filter by category
    if (activeCategory !== 'all') {
      agents = agents.filter((agent) => agent.category === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      agents = agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.role.toLowerCase().includes(query) ||
          agent.specialties.some((s) => s.toLowerCase().includes(query))
      );
    }

    return agents;
  }, [searchQuery, activeCategory]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      // Reset state on close
      setSearchQuery('');
      setActiveCategory('all');
      setSelectedAgentId(null);
      setFocusedIndex(-1);
    }
  }, [open]);

  // Handle agent selection
  const handleSelectAgent = useCallback(
    async (agent: AgentPersona) => {
      if (createThreadMutation.isPending) return;

      setSelectedAgentId(agent.id);

      try {
        const newThread = await createThreadMutation.mutateAsync({
          agentId: agent.id,
          agentName: agent.name,
          subject: `Chat with ${agent.name}`,
        });

        onOpenChange(false);
        onThreadCreated?.(newThread.id);
        router.push(`/inbox/${newThread.id}`);
      } catch (error) {
        console.error('[NewChatModal] Failed to create thread:', error);
        setSelectedAgentId(null);
      }
    },
    [createThreadMutation, onOpenChange, onThreadCreated, router]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const cols = 3; // Grid columns
      const total = filteredAgents.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + cols < total ? prev + cols : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - cols >= 0 ? prev - cols : prev));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex((prev) => (prev < total - 1 ? prev + 1 : prev));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && filteredAgents[focusedIndex]) {
            handleSelectAgent(filteredAgents[focusedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [filteredAgents, focusedIndex, handleSelectAgent, onOpenChange]
  );

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
        </DialogOverlay>

        {/* Flex Centering Wrapper - Reliable centering approach */}
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
          <DialogContent asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onKeyDown={handleKeyDown}
              className={cn(
                // Enable pointer events on modal
                'pointer-events-auto',
                // Dimensions
                'w-full max-w-2xl',
                'max-h-[85vh]',
                // Layout
                'flex flex-col overflow-hidden',
                // Grok-style dark aesthetic
                'rounded-2xl border border-zinc-800',
                'bg-[#030712]',
                'shadow-2xl shadow-black/60',
                'focus:outline-none'
              )}
            >
            {/* Header - Grok Dark Style */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                  <MessageSquarePlus className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-white">
                    Neues Gespräch
                  </DialogTitle>
                  <DialogDescription className="text-sm text-zinc-500">
                    Wähle einen Agenten für dein Anliegen
                  </DialogDescription>
                </div>
              </div>

              <DialogClose asChild>
                <button
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'text-zinc-500 hover:text-white hover:bg-zinc-800'
                  )}
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            {/* Search & Filters - Grok Dark Style */}
            <div className="px-6 py-4 border-b border-zinc-800 space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Agent suchen..."
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl',
                    'bg-zinc-900/80 border border-zinc-800',
                    'text-sm text-white placeholder-zinc-600',
                    'focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20',
                    'transition-all'
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                      activeCategory === category.id
                        ? 'bg-violet-500 text-white'
                        : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                    )}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Grid - Grok Dark Style */}
            <div
              ref={gridRef}
              className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
            >
              {filteredAgents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Sparkles className="h-12 w-12 text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm">
                    Keine Agenten gefunden
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredAgents.map((agent, index) => {
                    const IconComponent = agent.icon;
                    const isSelected = selectedAgentId === agent.id;
                    const isFocused = focusedIndex === index;
                    const isLoading = isSelected && createThreadMutation.isPending;

                    return (
                      <button
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        onMouseEnter={() => setFocusedIndex(index)}
                        disabled={createThreadMutation.isPending}
                        className={cn(
                          'relative flex flex-col items-center gap-2 p-4 rounded-xl',
                          'border transition-all duration-200',
                          'focus:outline-none',
                          isSelected && 'border-violet-500 bg-violet-500/10',
                          isFocused && !isSelected && 'border-zinc-600 bg-zinc-800/50',
                          !isSelected && !isFocused && 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30',
                          createThreadMutation.isPending && !isSelected && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {/* Loading Overlay */}
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-xl">
                            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                          </div>
                        )}

                        {/* Agent Icon */}
                        <div
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-xl',
                            'border border-white/5 transition-all'
                          )}
                          style={{ backgroundColor: `${agent.color}15` }}
                        >
                          {typeof IconComponent === 'string' ? (
                            <span className="text-2xl">{IconComponent}</span>
                          ) : (
                            <IconComponent
                              className="h-6 w-6"
                              style={{ color: agent.color }}
                            />
                          )}
                        </div>

                        {/* Agent Info */}
                        <div className="text-center min-w-0 w-full">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-medium text-white text-sm truncate">
                              {agent.name}
                            </span>
                            {agent.status === 'beta' && (
                              <span className="px-1 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-500">
                                BETA
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {agent.role}
                          </p>
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && !isLoading && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: agent.color }}
                            />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer - Grok Dark Style */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{filteredAgents.length} Agenten verfügbar</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-400">
                      ↑↓←→
                    </kbd>
                    Navigieren
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-400">
                      Enter
                    </kbd>
                    Auswählen
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px] text-zinc-400">
                      Esc
                    </kbd>
                    Schließen
                  </span>
                </div>
              </div>
            </div>
            </motion.div>
          </DialogContent>
        </div>
      </DialogPortal>
    </DialogRoot>
  );
}

export default NewChatModal;
