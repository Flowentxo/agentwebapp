'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  Command,
  Search,
  ChevronRight,
  Bot,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useShell } from './ShellContext';
import { useCompleteAgents } from '@/lib/agents/useCompleteAgents';
import { UserProfileBox } from './UserProfileBox';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

// Mock agents for command palette - in production, fetch from API
const DEMO_AGENTS = [
  { id: 'dexter', name: 'Dexter', buildStatus: 'complete' as const },
  { id: 'cassie', name: 'Cassie', buildStatus: 'complete' as const },
  { id: 'emmie', name: 'Emmie', state: 'ready' as const },
  { id: 'aura', name: 'Aura', buildStatus: 'complete' as const },
  { id: 'nova', name: 'Nova', state: 'ready' as const },
];

const pathLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/agents': 'Agents',
  '/workflows': 'Workflows',
  '/knowledge': 'Wissensbasis',
  '/brain': 'Brain AI',
  '/analytics': 'Analytics',
  '/board': 'Board',
  '/admin': 'Admin',
  '/settings': 'Einstellungen',
  '/brain/analytics': 'Analytics', // Brain AI Analytics sub-page
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setSidebarOpen } = useShell();
  const [commandOpen, setCommandOpen] = useState(false);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);

  const completeAgents = useCompleteAgents(DEMO_AGENTS);

  // Build breadcrumb from pathname
  const breadcrumbSegments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      const fullPath = `/${segment}`;
      return {
        label: pathLabels[fullPath] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: fullPath,
        isCurrent: pathname === fullPath,
      };
    });

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setReturnFocus(document.activeElement as HTMLElement);
        setCommandOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Restore focus when command palette closes
  useEffect(() => {
    if (!commandOpen && returnFocus) {
      returnFocus.focus();
      setReturnFocus(null);
    }
  }, [commandOpen, returnFocus]);

  const handleCommandSelect = (action: string, value?: string) => {
    setCommandOpen(false);

    switch (action) {
      case 'navigate':
        if (value) router.push(value);
        break;
      case 'toggle-active':
        // Emit custom event for active filter toggle
        window.dispatchEvent(new CustomEvent('ui:toggleActiveFilter'));
        break;
      case 'open-agent':
        if (value) router.push(`/agents/${value}`);
        break;
    }
  };

  return (
    <>
      <header
        role="banner"
        className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b-2 border-border"
      >
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: Hamburger (mobile) + Breadcrumb */}
          <div className="flex items-center gap-4">
            {/* Hamburger button (< lg) */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Navigation öffnen"
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-border bg-card text-muted-foreground transition-all hover:bg-muted hover:border-primary/30 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm">
                {breadcrumbSegments.map((segment, index) => (
                  <li key={segment.href} className="flex items-center gap-2">
                    {index > 0 && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    )}
                    {segment.isCurrent ? (
                      <span
                        className="font-semibold text-foreground"
                        aria-current="page"
                      >
                        {segment.label}
                      </span>
                    ) : (
                      <a
                        href={segment.href}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {segment.label}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* Right: Theme Toggle + Command Palette + User Menu */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle variant="icon" />

            {/* Command Palette Button */}
            <button
              onClick={() => {
                setReturnFocus(document.activeElement as HTMLElement);
                setCommandOpen(true);
              }}
              className="flex h-9 items-center gap-2 rounded-xl border-2 border-border bg-card px-3 text-sm text-muted-foreground transition-all hover:bg-muted hover:border-primary/30 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <Command className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Schnellaktionen</span>
              <kbd className="hidden rounded border border-border bg-muted/50 px-1.5 py-0.5 text-xs font-mono sm:inline">
                ⌘K
              </kbd>
            </button>

            {/* User Profile Box with Level */}
            <UserProfileBox />
          </div>
        </div>
      </header>

      {/* Command Palette Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Aktion suchen..." />
        <CommandList>
          <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => handleCommandSelect('navigate', '/agents')}>
              <Bot className="mr-2 h-4 w-4" />
              Zu Agents wechseln
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect('navigate', '/workflows')}>
              <Search className="mr-2 h-4 w-4" />
              Zu Workflows wechseln
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect('navigate', '/analytics')}>
              <Search className="mr-2 h-4 w-4" />
              Zu Analytics wechseln
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Aktionen">
            <CommandItem onSelect={() => handleCommandSelect('toggle-active')}>
              <Search className="mr-2 h-4 w-4" />
              Nur aktive umschalten
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Agents öffnen">
            {completeAgents.map((agent) => (
              <CommandItem
                key={agent.id}
                onSelect={() => handleCommandSelect('open-agent', agent.id)}
              >
                <Bot className="mr-2 h-4 w-4" />
                Agent öffnen: {agent.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
