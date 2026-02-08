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
import { ChatSidebar } from './components/ChatSidebar';
import { Menu, X } from 'lucide-react';
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
    <div className="flex h-full w-full bg-[#0a0a0a] overflow-hidden">
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
          'border-r border-white/[0.05]',
          'bg-[#050505]',
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <ChatSidebar
          searchInputRef={searchInputRef}
          onSelectThread={() => setMobileSidebarOpen(false)}
          notificationPermission={permission}
          notificationsEnabled={settings.enabled}
          onToggleNotifications={() => updateSettings({ enabled: !settings.enabled })}
          onRequestNotificationPermission={requestPermission}
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
      <main className="flex-1 min-w-0 flex flex-col bg-[#0a0a0a] inbox-workspace-glow">
        {children}
      </main>

    </div>
  );
}
