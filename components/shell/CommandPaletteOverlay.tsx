'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Sparkles,
  FileText,
  Settings,
  Users,
  Zap,
  Calendar,
  Upload,
  X,
  ArrowRight,
  Command as CommandIcon,
  LayoutDashboard,
  Inbox,
  BarChart3,
  Shield,
  Brain,
  FolderKanban,
  Terminal,
  Workflow,
  BookOpen,
  Globe,
  UserPlus
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPaletteOverlay({ isOpen, onClose }: CommandPaletteOverlayProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Quick actions - configured here
  const quickActions: QuickAction[] = [
    // Core Navigation
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'View your main dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      action: () => {
        router.push('/dashboard');
        onClose();
      },
      keywords: ['home', 'dashboard', 'overview', 'main']
    },
    {
      id: 'inbox',
      label: 'Inbox',
      description: 'Check your inbox',
      icon: <Inbox className="h-5 w-5" />,
      action: () => {
        router.push('/inbox');
        onClose();
      },
      keywords: ['inbox', 'messages', 'notifications']
    },
    {
      id: 'command-center',
      label: 'Command Center',
      description: 'Open Command Center',
      icon: <Terminal className="h-5 w-5" />,
      action: () => {
        router.push('/commands');
        onClose();
      },
      keywords: ['command', 'center', 'terminal', 'control']
    },

    // Agent Actions (with shortcuts)
    {
      id: 'new-agent',
      label: 'New Agent',
      description: 'Create a new AI agent',
      icon: <Sparkles className="h-5 w-5" />,
      shortcut: '⌘N',
      action: () => {
        router.push('/agents/studio');
        onClose();
      },
      keywords: ['create', 'new', 'agent', 'build', 'studio']
    },
    {
      id: 'agents-browse',
      label: 'Browse Agents',
      description: 'View all available agents',
      icon: <Users className="h-5 w-5" />,
      action: () => {
        router.push('/agents/browse');
        onClose();
      },
      keywords: ['agents', 'browse', 'all', 'list', 'marketplace']
    },
    {
      id: 'my-agents',
      label: 'My Agents',
      description: 'View your created agents',
      icon: <FolderKanban className="h-5 w-5" />,
      action: () => {
        router.push('/agents/my-agents');
        onClose();
      },
      keywords: ['my', 'agents', 'created', 'custom']
    },
    {
      id: 'collaborate',
      label: 'Collaboration Lab',
      description: 'Multi-agent collaboration',
      icon: <Users className="h-5 w-5" />,
      action: () => {
        router.push('/agents/collaborate');
        onClose();
      },
      keywords: ['collaborate', 'team', 'multi', 'together']
    },
    {
      id: 'teams',
      label: 'Agent Teams',
      description: 'Manage agent teams',
      icon: <UserPlus className="h-5 w-5" />,
      action: () => {
        router.push('/teams');
        onClose();
      },
      keywords: ['teams', 'groups', 'organization']
    },
    {
      id: 'revolutionary',
      label: 'Agent Revolution',
      description: 'Explore revolutionary agents',
      icon: <Zap className="h-5 w-5" />,
      action: () => {
        router.push('/revolution');
        onClose();
      },
      keywords: ['revolution', 'advanced', 'powerful', 'elite']
    },

    // Brain AI & Knowledge
    {
      id: 'brain',
      label: 'Brain AI',
      description: 'Open Brain AI dashboard',
      icon: <Brain className="h-5 w-5" />,
      action: () => {
        router.push('/brain');
        onClose();
      },
      keywords: ['brain', 'ai', 'knowledge', 'dashboard', 'intelligence']
    },
    {
      id: 'upload-document',
      label: 'Upload Document',
      description: 'Upload document to Brain AI',
      icon: <Upload className="h-5 w-5" />,
      shortcut: '⌘U',
      action: () => {
        router.push('/brain?upload=true');
        onClose();
      },
      keywords: ['upload', 'document', 'file', 'brain', 'add']
    },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      description: 'View knowledge base',
      icon: <BookOpen className="h-5 w-5" />,
      action: () => {
        router.push('/knowledge');
        onClose();
      },
      keywords: ['knowledge', 'base', 'docs', 'documentation', 'learn']
    },
    {
      id: 'calendar',
      label: 'Connect Calendar',
      description: 'Connect Google Calendar for briefings',
      icon: <Calendar className="h-5 w-5" />,
      action: () => {
        router.push('/brain');
        onClose();
      },
      keywords: ['calendar', 'google', 'briefing', 'meeting', 'schedule']
    },

    // Workflows
    {
      id: 'workflows',
      label: 'Workflows',
      description: 'Manage your workflows',
      icon: <Workflow className="h-5 w-5" />,
      action: () => {
        router.push('/workflows');
        onClose();
      },
      keywords: ['workflow', 'automation', 'process', 'flow']
    },
    {
      id: 'board',
      label: 'Board',
      description: 'View your task board',
      icon: <FolderKanban className="h-5 w-5" />,
      action: () => {
        router.push('/board');
        onClose();
      },
      keywords: ['board', 'kanban', 'tasks', 'project']
    },

    // Management & Analytics
    {
      id: 'analytics',
      label: 'Analytics',
      description: 'View analytics and insights',
      icon: <BarChart3 className="h-5 w-5" />,
      action: () => {
        router.push('/analytics');
        onClose();
      },
      keywords: ['analytics', 'stats', 'metrics', 'insights', 'data']
    },
    {
      id: 'admin',
      label: 'Admin',
      description: 'Admin panel and settings',
      icon: <Shield className="h-5 w-5" />,
      action: () => {
        router.push('/admin');
        onClose();
      },
      keywords: ['admin', 'administrator', 'manage', 'system']
    },

    // Settings
    {
      id: 'settings',
      label: 'Settings',
      description: 'Open application settings',
      icon: <Settings className="h-5 w-5" />,
      shortcut: '⌘.',
      action: () => {
        router.push('/settings');
        onClose();
      },
      keywords: ['settings', 'preferences', 'config', 'configuration']
    },
    {
      id: 'integrations',
      label: 'Integrations',
      description: 'Manage integrations',
      icon: <Globe className="h-5 w-5" />,
      action: () => {
        router.push('/settings?tab=integrations');
        onClose();
      },
      keywords: ['integrations', 'connect', 'oauth', 'google', 'api']
    }
  ];

  // Filter actions based on search
  const filteredActions = search.trim()
    ? quickActions.filter(action =>
        action.label.toLowerCase().includes(search.toLowerCase()) ||
        action.description.toLowerCase().includes(search.toLowerCase()) ||
        action.keywords?.some(kw => kw.toLowerCase().includes(search.toLowerCase()))
      )
    : quickActions;

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-popover rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions... (or use shortcuts)"
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Actions List */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredActions.length > 0 ? (
            <div className="space-y-1">
              {filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    index === selectedIndex
                      ? 'bg-primary/8 border border-primary/30'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                      index === selectedIndex
                        ? 'bg-primary/12 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {action.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-foreground">
                      {action.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                  {action.shortcut && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted border border-border">
                      <span className="text-xs text-muted-foreground font-mono">
                        {action.shortcut}
                      </span>
                    </div>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">No actions found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono">ESC</kbd>
              Close
            </span>
          </div>
          <div className="flex items-center gap-1">
            <CommandIcon className="h-3 w-3" />
            <span>Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}
