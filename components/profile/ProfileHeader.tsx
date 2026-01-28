/**
 * Profile Header - Full-width header with avatar, name, quick actions and user menu
 * Positioned at the very top edge with integrated command palette
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileResponse } from '@/lib/profile/schemas';
import { LogOut, Command, Menu, Bot, Search, User } from 'lucide-react';
import { useShell } from '@/components/shell/ShellContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useCompleteAgents } from '@/lib/agents/useCompleteAgents';

// Demo agents for command palette
const DEMO_AGENTS = [
  { id: 'dexter', name: 'Dexter', buildStatus: 'complete' as const },
  { id: 'cassie', name: 'Cassie', buildStatus: 'complete' as const },
  { id: 'emmie', name: 'Emmie', state: 'ready' as const },
  { id: 'aura', name: 'Aura', buildStatus: 'complete' as const },
  { id: 'nova', name: 'Nova', state: 'ready' as const },
];

interface ProfileHeaderProps {
  profile: ProfileResponse;
  onLogout?: () => void;
}

export default function ProfileHeader({ profile, onLogout }: ProfileHeaderProps) {
  const router = useRouter();
  const { setSidebarOpen } = useShell();
  const [commandOpen, setCommandOpen] = useState(false);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const completeAgents = useCompleteAgents(DEMO_AGENTS);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (onLogout) {
      onLogout();
    } else {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('[LOGOUT] Error:', error);
      }
      window.location.href = '/login';
    }
    setIsLoggingOut(false);
  };

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
        window.dispatchEvent(new CustomEvent('ui:toggleActiveFilter'));
        break;
      case 'open-agent':
        if (value) router.push(`/agents/${value}`);
        break;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[rgb(var(--surface-0))]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: Hamburger (mobile) + Name */}
          <div className="flex items-center gap-4">
            {/* Hamburger button (mobile only) */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Navigation öffnen"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-card/5 text-white/60 transition-colors hover:bg-card/10 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Name + Email (no avatar) */}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white leading-tight">
                {profile.displayName || 'Kein Name'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/50">{profile.email}</span>
                {profile.emailVerified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 ring-1 ring-green-500/20">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Verifiziert
                  </span>
                )}
              </div>
            </div>

            {/* Roles */}
            {profile.roles && profile.roles.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5">
                {profile.roles.slice(0, 2).map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-card/5 text-white/70 ring-1 ring-white/10"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: Command Palette + User Menu + Logout */}
          <div className="flex items-center gap-2">
            {/* Command Palette Button */}
            <button
              onClick={() => {
                setReturnFocus(document.activeElement as HTMLElement);
                setCommandOpen(true);
              }}
              className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-card/5 px-3 text-sm text-white/60 transition-colors hover:bg-card/10 hover:text-white"
            >
              <Command className="h-4 w-4" />
              <span className="hidden sm:inline">Schnellaktionen</span>
              <kbd className="hidden rounded border border-white/10 bg-card/5 px-1.5 py-0.5 text-xs font-mono sm:inline">
                ⌘K
              </kbd>
            </button>

            {/* User Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Benutzermenü"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-card/5 text-white/60 transition-colors hover:bg-card/10 hover:text-white"
                >
                  <User className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <Bot className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/agents/my-agents')}>
                  <Bot className="mr-2 h-4 w-4" />
                  Meine Agents
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? 'Wird abgemeldet...' : 'Abmelden'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-medium ring-1 ring-red-500/20 hover:ring-red-500/30 transition-all disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">{isLoggingOut ? 'Abmelden...' : 'Abmelden'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Command Palette Dialog */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Aktion suchen..." />
        <CommandList>
          <CommandEmpty>Keine Ergebnisse gefunden.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => handleCommandSelect('navigate', '/dashboard')}>
              <Bot className="mr-2 h-4 w-4" />
              Zu Dashboard wechseln
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect('navigate', '/agents/my-agents')}>
              <Bot className="mr-2 h-4 w-4" />
              Zu Agents wechseln
            </CommandItem>
            <CommandItem onSelect={() => handleCommandSelect('navigate', '/brain')}>
              <Search className="mr-2 h-4 w-4" />
              Zu Brain AI wechseln
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
