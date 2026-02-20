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
import { ChatSidebar } from './components/ChatSidebar';
import { Menu, X, PanelLeftOpen } from 'lucide-react';
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

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ backgroundColor: 'var(--vicy-bg)' }}>
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

      {/* Left Pane: Chat Sidebar - Collapsible on desktop */}
      <div
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-40 flex-shrink-0',
          'transition-all duration-300 ease-in-out lg:transform-none',
          'border-r border-white/[0.08]',
          'bg-[#0a0f1a]',
          isSidebarOpen ? 'w-72' : 'lg:w-0 lg:overflow-hidden w-72',
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
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
      <main className="relative flex-1 min-w-0 flex flex-col inbox-workspace-glow" style={{ backgroundColor: 'var(--vicy-bg)' }}>
        {/* Reopen sidebar button (desktop only, when collapsed) */}
        {mounted && !isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex absolute top-4 left-4 z-40 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all"
            title="Sidebar öffnen"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
        {children}
      </main>

    </div>
  );
}
