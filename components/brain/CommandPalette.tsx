/**
 * ⌘ Command Palette - Universal Action Center
 * Enterprise-grade command interface (Cmd/Ctrl + K)
 *
 * FEATURES:
 * - Global keyboard shortcut (Cmd/Ctrl + K)
 * - Fuzzy search across all commands
 * - Category-based organization
 * - Permission-aware filtering
 * - Recent commands history
 * - Keyboard navigation (↑/↓, Enter, Esc)
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Home,
  Upload,
  Sparkles,
  FileText,
  BarChart3,
  Settings,
  Users,
  Workflow,
  HelpCircle,
  LogOut,
  Folder,
  Brain,
  Search,
  Zap,
  Star,
  Clock,
} from 'lucide-react';
import type { Command as CommandType, CommandCategory } from '@/types/brain-enterprise';

interface CommandPaletteProps {
  currentUser?: {
    role: 'admin' | 'editor' | 'stakeholder' | 'guest';
  };
}

export function CommandPalette({ currentUser }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Load recent commands from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const recent = localStorage.getItem('brain-recent-commands');
      if (recent) {
        setRecentCommands(JSON.parse(recent));
      }
    }
  }, []);

  // Save command to recent
  const saveToRecent = useCallback((commandId: string) => {
    setRecentCommands((prev) => {
      const updated = [commandId, ...prev.filter((id) => id !== commandId)].slice(0, 5);
      if (typeof window !== 'undefined') {
        localStorage.setItem('brain-recent-commands', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Execute command and close palette
  const executeCommand = useCallback(
    (command: CommandType) => {
      saveToRecent(command.id);
      command.handler();
      setOpen(false);
      setSearch('');
    },
    [saveToRecent]
  );

  // Define all available commands
  const commands: CommandType[] = useMemo(
    () => [
      // === NAVIGATION ===
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        category: 'navigation',
        icon: 'Home',
        shortcut: 'G D',
        handler: () => router.push('/brain'),
        searchTerms: ['dashboard', 'home', 'overview'],
      },
      {
        id: 'nav-analytics',
        label: 'Go to Analytics',
        category: 'navigation',
        icon: 'BarChart3',
        shortcut: 'G A',
        handler: () => router.push('/brain/analytics'),
        searchTerms: ['analytics', 'reports', 'metrics', 'charts'],
      },
      {
        id: 'nav-workflows',
        label: 'Go to Workflows',
        category: 'navigation',
        icon: 'Workflow',
        handler: () => router.push('/brain/workflows'),
        searchTerms: ['workflows', 'automation', 'tasks'],
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        category: 'navigation',
        icon: 'Settings',
        handler: () => router.push('/brain/settings'),
        searchTerms: ['settings', 'preferences', 'configuration'],
      },

      // === ACTIONS ===
      {
        id: 'action-upload',
        label: 'Upload Document',
        description: 'Add new knowledge to your brain',
        category: 'actions',
        icon: 'Upload',
        shortcut: 'U',
        handler: () => {
          console.log('Open upload modal');
          // TODO: Open upload modal
        },
        searchTerms: ['upload', 'add', 'document', 'file'],
      },
      {
        id: 'action-query',
        label: 'New AI Query',
        description: 'Ask a question to your AI agents',
        category: 'actions',
        icon: 'Sparkles',
        shortcut: 'Q',
        handler: () => {
          console.log('Open query modal');
          // TODO: Open query modal
        },
        searchTerms: ['query', 'ask', 'question', 'ai', 'search'],
      },
      {
        id: 'action-workflow-create',
        label: 'Create Workflow',
        description: 'Build a new automation workflow',
        category: 'actions',
        icon: 'Zap',
        handler: () => router.push('/brain/workflows/new'),
        searchTerms: ['workflow', 'create', 'automation', 'new'],
        permission: { resource: 'workflows', action: 'write', scope: 'own' },
      },
      {
        id: 'action-export',
        label: 'Export Data',
        description: 'Download analytics or documents',
        category: 'actions',
        icon: 'FileText',
        handler: () => {
          console.log('Open export modal');
          // TODO: Open export modal
        },
        searchTerms: ['export', 'download', 'csv', 'data'],
        permission: { resource: 'documents', action: 'read', scope: 'all' },
      },

      // === DOCUMENTS ===
      {
        id: 'doc-recent',
        label: 'Recent Documents',
        category: 'documents',
        icon: 'Clock',
        handler: () => router.push('/brain/documents?filter=recent'),
        searchTerms: ['recent', 'documents', 'latest'],
      },
      {
        id: 'doc-starred',
        label: 'Starred Documents',
        category: 'documents',
        icon: 'Star',
        handler: () => router.push('/brain/documents?filter=starred'),
        searchTerms: ['starred', 'favorites', 'bookmarks'],
      },
      {
        id: 'doc-search',
        label: 'Search Documents',
        category: 'documents',
        icon: 'Search',
        shortcut: '/',
        handler: () => {
          console.log('Focus document search');
          // TODO: Focus search input
        },
        searchTerms: ['search', 'find', 'documents'],
      },

      // === HELP ===
      {
        id: 'help-docs',
        label: 'Help & Documentation',
        category: 'help',
        icon: 'HelpCircle',
        shortcut: '?',
        handler: () => router.push('/brain/help'),
        searchTerms: ['help', 'docs', 'documentation', 'support'],
      },
      {
        id: 'help-shortcuts',
        label: 'Keyboard Shortcuts',
        category: 'help',
        icon: 'Zap',
        handler: () => {
          console.log('Show shortcuts modal');
          // TODO: Show shortcuts modal
        },
        searchTerms: ['shortcuts', 'keyboard', 'hotkeys'],
      },

      // === SETTINGS ===
      {
        id: 'settings-theme',
        label: 'Toggle Dark Mode',
        category: 'settings',
        icon: 'Settings',
        handler: () => {
          console.log('Toggle theme');
          // TODO: Toggle theme
        },
        searchTerms: ['theme', 'dark', 'light', 'mode'],
      },
      {
        id: 'settings-logout',
        label: 'Log Out',
        category: 'settings',
        icon: 'LogOut',
        handler: () => router.push('/api/auth/logout'),
        searchTerms: ['logout', 'sign out', 'exit'],
      },
    ],
    [router]
  );

  // Filter commands by permission
  const availableCommands = useMemo(() => {
    return commands.filter((cmd) => {
      if (!cmd.permission) return true;
      if (!currentUser) return false;

      // Admin has all permissions
      if (currentUser.role === 'admin') return true;

      // TODO: Implement granular permission checking
      // For now, allow editors to create workflows
      if (cmd.permission.resource === 'workflows' && cmd.permission.action === 'write') {
        return currentUser.role === 'editor';
      }

      return true;
    });
  }, [commands, currentUser]);

  // Get recent commands
  const recentCommandsList = useMemo(() => {
    return recentCommands
      .map((id) => availableCommands.find((cmd) => cmd.id === id))
      .filter(Boolean) as CommandType[];
  }, [recentCommands, availableCommands]);

  // Group commands by category
  const commandsByCategory = useMemo(() => {
    const groups: Record<CommandCategory, CommandType[]> = {
      navigation: [],
      actions: [],
      documents: [],
      workflows: [],
      help: [],
      settings: [],
    };

    availableCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [availableCommands]);

  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Home,
    Upload,
    Sparkles,
    FileText,
    BarChart3,
    Settings,
    Users,
    Workflow,
    HelpCircle,
    LogOut,
    Folder,
    Brain,
    Search,
    Zap,
    Star,
    Clock,
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Recent Commands */}
        {recentCommandsList.length > 0 && !search && (
          <>
            <CommandGroup heading="Recent">
              {recentCommandsList.map((command) => {
                const Icon = command.icon ? iconMap[command.icon] : null;
                return (
                  <CommandItem
                    key={command.id}
                    value={command.label}
                    onSelect={() => executeCommand(command)}
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    <span>{command.label}</span>
                    {command.shortcut && (
                      <kbd className="ml-auto text-xs text-text-muted bg-card-contrast px-2 py-1 rounded">
                        {command.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation Commands */}
        {commandsByCategory.navigation.length > 0 && (
          <CommandGroup heading="Navigation">
            {commandsByCategory.navigation.map((command) => {
              const Icon = command.icon ? iconMap[command.icon] : null;
              return (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.searchTerms?.join(' ')}`}
                  onSelect={() => executeCommand(command)}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  <span>{command.label}</span>
                  {command.shortcut && (
                    <kbd className="ml-auto text-xs text-text-muted bg-card-contrast px-2 py-1 rounded">
                      {command.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Action Commands */}
        {commandsByCategory.actions.length > 0 && (
          <CommandGroup heading="Actions">
            {commandsByCategory.actions.map((command) => {
              const Icon = command.icon ? iconMap[command.icon] : null;
              return (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.searchTerms?.join(' ')}`}
                  onSelect={() => executeCommand(command)}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  <div className="flex-1">
                    <p className="font-medium">{command.label}</p>
                    {command.description && (
                      <p className="text-xs text-text-muted">{command.description}</p>
                    )}
                  </div>
                  {command.shortcut && (
                    <kbd className="text-xs text-text-muted bg-card-contrast px-2 py-1 rounded">
                      {command.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Document Commands */}
        {commandsByCategory.documents.length > 0 && (
          <CommandGroup heading="Documents">
            {commandsByCategory.documents.map((command) => {
              const Icon = command.icon ? iconMap[command.icon] : null;
              return (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.searchTerms?.join(' ')}`}
                  onSelect={() => executeCommand(command)}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  <span>{command.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Help Commands */}
        {commandsByCategory.help.length > 0 && (
          <CommandGroup heading="Help">
            {commandsByCategory.help.map((command) => {
              const Icon = command.icon ? iconMap[command.icon] : null;
              return (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.searchTerms?.join(' ')}`}
                  onSelect={() => executeCommand(command)}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  <span>{command.label}</span>
                  {command.shortcut && (
                    <kbd className="ml-auto text-xs text-text-muted bg-card-contrast px-2 py-1 rounded">
                      {command.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Settings Commands */}
        {commandsByCategory.settings.length > 0 && (
          <CommandGroup heading="Settings">
            {commandsByCategory.settings.map((command) => {
              const Icon = command.icon ? iconMap[command.icon] : null;
              return (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.searchTerms?.join(' ')}`}
                  onSelect={() => executeCommand(command)}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  <span>{command.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer hint */}
      <div className="border-t border-border px-4 py-2 text-xs text-text-muted flex items-center justify-between">
        <span>Press Esc to close</span>
        <span>↑↓ to navigate, Enter to select</span>
      </div>
    </CommandDialog>
  );
}
