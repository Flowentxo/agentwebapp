'use client';

/**
 * Flowent Inbox v3 - Chat Layout (Grok-Style)
 * Two-pane layout: ChatSidebar (left) + ChatInterface (right)
 *
 * Now nested within Dashboard shell - uses h-full instead of h-screen
 * Now with real-time Socket.IO updates
 */

import { useRef, useState, useEffect } from 'react';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import { useInboxShortcuts } from '@/lib/hooks/useInboxShortcuts';
import { useInboxNotifications } from '@/lib/hooks/useNotifications';
import { InboxSocketProvider } from '@/lib/socket';
import { ChatSidebar } from './components/ChatSidebar';
import { Menu, X, Keyboard, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSidebarOpen, toggleSidebar } = useInboxStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering client-specific UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize global keyboard shortcuts
  useInboxShortcuts({ searchInputRef });

  // Initialize desktop notifications
  const {
    permission,
    isEnabled,
    requestPermission,
    settings,
    updateSettings,
  } = useInboxNotifications();

  return (
    <InboxSocketProvider>
    <div className="flex h-full w-full bg-white dark:bg-[#0a0a0a] overflow-hidden">
      {/* Mobile Menu Toggle - only render after mount to prevent hydration mismatch */}
      {mounted && (
        <button
          data-testid="mobile-menu-toggle"
          onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border-2 border-border rounded-xl text-muted-foreground hover:text-foreground shadow-sm transition-colors"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {/* Left Pane: Chat Sidebar - Nearly invisible in empty state */}
      <div
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-40 w-72 flex-shrink-0',
          'transform transition-all duration-300 ease-in-out lg:transform-none',
          'border-r border-transparent dark:border-transparent',
          'bg-transparent',
          isMobileSidebarOpen ? 'translate-x-0 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <ChatSidebar
          searchInputRef={searchInputRef}
          onSelectThread={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Right Pane: Chat Interface (Messages) - Pure white/black */}
      <main className="flex-1 min-w-0 flex flex-col bg-white dark:bg-[#0a0a0a]">
        {children}
      </main>

      {/* Bottom bar - shortcuts and notifications - only render after mount */}
      {mounted && (
        <div className="hidden lg:flex fixed bottom-4 right-4 items-center gap-3 z-10">
          {/* Notification status indicator */}
          {permission === 'default' && (
            <button
              onClick={() => requestPermission()}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 hover:bg-primary/10 border-2 border-primary/20 rounded-xl text-xs text-primary font-medium transition-colors"
              title="Enable desktop notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable notifications</span>
            </button>
          )}
          {permission === 'granted' && (
            <button
              onClick={() => updateSettings({ enabled: !settings.enabled })}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 border-2 rounded-xl text-xs font-medium transition-colors',
                settings.enabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              )}
              title={settings.enabled ? 'Notifications enabled' : 'Notifications paused'}
            >
              {settings.enabled ? (
                <Bell className="w-3.5 h-3.5" />
              ) : (
                <BellOff className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-card/95 backdrop-blur-sm border-2 border-border rounded-xl text-xs text-muted-foreground shadow-sm">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded font-mono text-muted-foreground">?</kbd>
            <span>for shortcuts</span>
          </div>
        </div>
      )}
    </div>
    </InboxSocketProvider>
  );
}
