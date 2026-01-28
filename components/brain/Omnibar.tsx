/**
 * Brain AI v3.0 - Universal Omnibar (Command Palette)
 *
 * Central entry point for:
 * - Navigation
 * - Semantic search (RAG)
 * - AI actions and commands
 * - Connected search (external sources)
 *
 * Accessible via Cmd+K / Ctrl+K
 */

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  Brain,
  FileText,
  FolderOpen,
  Users,
  Settings,
  Sparkles,
  MessageSquare,
  PenTool,
  Calendar,
  GitBranch,
  Mail,
  ExternalLink,
  Clock,
  Loader2,
  ArrowRight,
  Command as CommandIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================
// TYPES
// ============================================

interface SearchResult {
  id: string;
  type: 'document' | 'project' | 'task' | 'person' | 'external' | 'action';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  provider?: string;
  url?: string;
  score?: number;
  action?: () => void;
}

interface AIAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
  action: (query: string) => void;
}

// ============================================
// AI ACTIONS
// ============================================

const AI_ACTIONS: AIAction[] = [
  {
    id: 'ask',
    label: 'Ask Brain AI',
    description: 'Ask any question about your workspace',
    icon: <Brain className="w-4 h-4" />,
    keywords: ['ask', 'question', 'what', 'how', 'why', 'explain'],
    action: () => {},
  },
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Get a summary of documents or projects',
    icon: <FileText className="w-4 h-4" />,
    keywords: ['summarize', 'summary', 'tldr', 'overview'],
    action: () => {},
  },
  {
    id: 'write',
    label: 'Write with AI',
    description: 'Generate content with AI Writer',
    icon: <PenTool className="w-4 h-4" />,
    keywords: ['write', 'draft', 'compose', 'create', 'generate'],
    action: () => {},
  },
  {
    id: 'standup',
    label: 'Generate Standup',
    description: 'Create standup report from recent activity',
    icon: <Calendar className="w-4 h-4" />,
    keywords: ['standup', 'status', 'daily', 'report', 'update'],
    action: () => {},
  },
];

// ============================================
// QUICK ACTIONS (Navigation)
// ============================================

const QUICK_ACTIONS = [
  { id: 'brain', label: 'Brain AI', icon: <Brain />, path: '/brain' },
  { id: 'dashboard', label: 'Dashboard', icon: <FolderOpen />, path: '/dashboard' },
  { id: 'agents', label: 'Browse Agents', icon: <Users />, path: '/agents/browse' },
  { id: 'settings', label: 'Settings', icon: <Settings />, path: '/settings' },
];

// ============================================
// OMNIBAR COMPONENT
// ============================================

export function Omnibar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef<number>(0);
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSearchResults([]);
      setSelectedAction(null);
      setIsSearching(false);
    }
  }, [open]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const currentRequestId = ++requestIdRef.current;

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        // Search connected sources
        const response = await fetch('/api/brain/connected/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            limit: 10,
          }),
        });

        // Ignore stale requests
        if (requestIdRef.current !== currentRequestId) return;

        if (response.ok) {
          const data = await response.json();
          const results: SearchResult[] = data.results?.map((r: {
            id: string;
            title: string;
            excerpt: string;
            provider: string;
            url?: string;
            score: number;
          }) => ({
            id: r.id,
            type: 'external' as const,
            title: r.title,
            subtitle: r.excerpt,
            provider: r.provider,
            url: r.url,
            score: r.score,
          })) || [];

          setSearchResults(results);
        }
      } catch (error) {
        console.error('[OMNIBAR] Search failed:', error);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsSearching(false);
        }
      }
    }, 300);
  }, []);

  // Handle query change
  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  // Detect AI action from query
  const detectAIAction = useCallback((q: string): AIAction | null => {
    const lowerQuery = q.toLowerCase();
    for (const action of AI_ACTIONS) {
      if (action.keywords.some(kw => lowerQuery.startsWith(kw))) {
        return action;
      }
    }
    return null;
  }, []);

  const detectedAction = detectAIAction(query);

  // Handle selection
  const handleSelect = useCallback((result: SearchResult) => {
    if (result.url) {
      window.open(result.url, '_blank');
    } else if (result.action) {
      result.action();
    }
    setOpen(false);
  }, []);

  const handleNavigate = useCallback((path: string) => {
    router.push(path);
    setOpen(false);
  }, [router]);

  const handleAIAction = useCallback((action: AIAction) => {
    // Extract the actual query after the keyword
    const queryWithoutKeyword = query.replace(
      new RegExp(`^(${action.keywords.join('|')})\\s*`, 'i'),
      ''
    );

    // Navigate to Brain with pre-filled query
    router.push(`/brain?action=${action.id}&q=${encodeURIComponent(queryWithoutKeyword)}`);
    setOpen(false);
  }, [query, router]);

  // Provider icon
  const getProviderIcon = (provider?: string) => {
    switch (provider) {
      case 'google_drive':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'slack':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'github':
        return <GitBranch className="w-4 h-4 text-muted-foreground" />;
      case 'gmail':
        return <Mail className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (!open) return null;

  return (
    <div className="omnibar-overlay">
      <div className="omnibar-backdrop" onClick={() => setOpen(false)} />
      <Command className="omnibar-container" loop>
        {/* Search Input */}
        <div className="omnibar-header">
          <Search className="omnibar-search-icon" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search, ask AI, or type a command..."
            className="omnibar-input"
            autoFocus
          />
          {isSearching && <Loader2 className="omnibar-loading animate-spin" />}
          <kbd className="omnibar-shortcut">ESC</kbd>
        </div>

        <Command.List className="omnibar-list">
          <Command.Empty className="omnibar-empty">
            {query.length > 0 ? (
              <div className="omnibar-empty-content">
                <Sparkles className="w-8 h-8 text-purple-400 mb-2" />
                <p>No results found. Ask Brain AI instead?</p>
                <button
                  className="omnibar-ask-button"
                  onClick={() => handleAIAction(AI_ACTIONS[0])}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Ask "{query}"
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground">Start typing to search...</p>
            )}
          </Command.Empty>

          {/* Detected AI Action */}
          {detectedAction && (
            <Command.Group heading="AI Action Detected">
              <Command.Item
                value={detectedAction.id}
                onSelect={() => handleAIAction(detectedAction)}
                className="omnibar-item omnibar-item-ai"
              >
                <div className="omnibar-item-icon omnibar-item-icon-ai">
                  {detectedAction.icon}
                </div>
                <div className="omnibar-item-content">
                  <span className="omnibar-item-title">{detectedAction.label}</span>
                  <span className="omnibar-item-subtitle">{detectedAction.description}</span>
                </div>
                <ArrowRight className="omnibar-item-action" />
              </Command.Item>
            </Command.Group>
          )}

          {/* Quick Actions */}
          {query.length === 0 && (
            <Command.Group heading="Quick Actions">
              {QUICK_ACTIONS.map(action => (
                <Command.Item
                  key={action.id}
                  value={action.label}
                  onSelect={() => handleNavigate(action.path)}
                  className="omnibar-item"
                >
                  <div className="omnibar-item-icon">{action.icon}</div>
                  <span className="omnibar-item-title">{action.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* AI Actions (when no query) */}
          {query.length === 0 && (
            <Command.Group heading="AI Features">
              {AI_ACTIONS.map(action => (
                <Command.Item
                  key={action.id}
                  value={action.label}
                  onSelect={() => handleAIAction(action)}
                  className="omnibar-item"
                >
                  <div className="omnibar-item-icon omnibar-item-icon-ai">
                    {action.icon}
                  </div>
                  <div className="omnibar-item-content">
                    <span className="omnibar-item-title">{action.label}</span>
                    <span className="omnibar-item-subtitle">{action.description}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Command.Group heading="Search Results">
              {searchResults.map(result => (
                <Command.Item
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result)}
                  className="omnibar-item"
                >
                  <div className="omnibar-item-icon">
                    {getProviderIcon(result.provider)}
                  </div>
                  <div className="omnibar-item-content">
                    <span className="omnibar-item-title">{result.title}</span>
                    {result.subtitle && (
                      <span className="omnibar-item-subtitle">{result.subtitle}</span>
                    )}
                  </div>
                  {result.provider && (
                    <span className="omnibar-item-badge">{result.provider}</span>
                  )}
                  {result.url && <ExternalLink className="omnibar-item-action" />}
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Loading Skeletons */}
          {isSearching && searchResults.length === 0 && query.length > 1 && (
            <Command.Group heading="Searching...">
              {[1, 2, 3].map(i => (
                <div key={i} className="omnibar-skeleton">
                  <div className="omnibar-skeleton-icon" />
                  <div className="omnibar-skeleton-content">
                    <div className="omnibar-skeleton-title" />
                    <div className="omnibar-skeleton-subtitle" />
                  </div>
                </div>
              ))}
            </Command.Group>
          )}
        </Command.List>

        {/* Footer */}
        <div className="omnibar-footer">
          <div className="omnibar-footer-hint">
            <CommandIcon className="w-3 h-3" />
            <span>+K to toggle</span>
          </div>
          <div className="omnibar-footer-hint">
            <span>↑↓ to navigate</span>
          </div>
          <div className="omnibar-footer-hint">
            <span>↵ to select</span>
          </div>
        </div>
      </Command>

      <style jsx global>{`
        .omnibar-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 15vh;
        }

        .omnibar-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }

        .omnibar-container {
          position: relative;
          width: 100%;
          max-width: 640px;
          background: var(--bg-primary, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .omnibar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .omnibar-search-icon {
          width: 20px;
          height: 20px;
          color: var(--text-tertiary, #666);
          flex-shrink: 0;
        }

        .omnibar-input {
          flex: 1;
          background: transparent;
          border: none;
          font-size: 16px;
          color: var(--text-primary, #fff);
          outline: none;
        }

        .omnibar-input::placeholder {
          color: var(--text-tertiary, #666);
        }

        .omnibar-loading {
          width: 16px;
          height: 16px;
          color: var(--color-primary, #7c3aed);
        }

        .omnibar-shortcut {
          padding: 4px 8px;
          background: var(--bg-secondary, #2a2a4a);
          border-radius: 6px;
          font-size: 11px;
          color: var(--text-tertiary, #888);
          font-family: monospace;
        }

        .omnibar-list {
          max-height: 400px;
          overflow-y: auto;
          padding: 8px;
        }

        .omnibar-list [cmdk-group-heading] {
          padding: 8px 12px 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary, #666);
        }

        .omnibar-empty {
          padding: 32px;
          text-align: center;
          color: var(--text-secondary, #999);
        }

        .omnibar-empty-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .omnibar-ask-button {
          display: flex;
          align-items: center;
          margin-top: 12px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .omnibar-ask-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        }

        .omnibar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .omnibar-item[data-selected='true'],
        .omnibar-item:hover {
          background: var(--bg-secondary, #2a2a4a);
        }

        .omnibar-item-ai[data-selected='true'],
        .omnibar-item-ai:hover {
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.2));
        }

        .omnibar-item-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary, #2a2a4a);
          border-radius: 8px;
          flex-shrink: 0;
        }

        .omnibar-item-icon-ai {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
        }

        .omnibar-item-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .omnibar-item-title {
          font-size: 14px;
          color: var(--text-primary, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .omnibar-item-subtitle {
          font-size: 12px;
          color: var(--text-tertiary, #666);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .omnibar-item-badge {
          padding: 2px 8px;
          background: var(--bg-tertiary, #3a3a5a);
          border-radius: 4px;
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-tertiary, #888);
        }

        .omnibar-item-action {
          width: 16px;
          height: 16px;
          color: var(--text-tertiary, #666);
        }

        .omnibar-skeleton {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
        }

        .omnibar-skeleton-icon {
          width: 36px;
          height: 36px;
          background: var(--bg-secondary, #2a2a4a);
          border-radius: 8px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .omnibar-skeleton-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .omnibar-skeleton-title {
          width: 60%;
          height: 14px;
          background: var(--bg-secondary, #2a2a4a);
          border-radius: 4px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        .omnibar-skeleton-subtitle {
          width: 40%;
          height: 12px;
          background: var(--bg-secondary, #2a2a4a);
          border-radius: 4px;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .omnibar-footer {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          border-top: 1px solid var(--border-color, #2a2a4a);
          background: var(--bg-secondary, #1e1e3a);
        }

        .omnibar-footer-hint {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-tertiary, #666);
        }
      `}</style>
    </div>
  );
}

// ============================================
// OMNIBAR TRIGGER BUTTON
// ============================================

export function OmnibarTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    // Dispatch keyboard event to trigger omnibar
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="omnibar-trigger"
      title="Search (⌘K)"
    >
      <Search className="w-4 h-4" />
      <span>Search...</span>
      <kbd>⌘K</kbd>

      <style jsx>{`
        .omnibar-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-secondary, #2a2a4a);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 8px;
          color: var(--text-secondary, #999);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .omnibar-trigger:hover {
          background: var(--bg-tertiary, #3a3a5a);
          border-color: var(--color-primary, #7c3aed);
        }

        .omnibar-trigger kbd {
          padding: 2px 6px;
          background: var(--bg-tertiary, #3a3a5a);
          border-radius: 4px;
          font-size: 11px;
          font-family: monospace;
        }
      `}</style>
    </button>
  );
}

export default Omnibar;
