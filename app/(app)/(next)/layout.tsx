'use client';

import { useState } from 'react';
import { WorkspaceProvider } from '@/lib/contexts/workspace-context';
import { ShellProvider } from '@/components/shell/ShellContext';
import { InboxSocketProvider } from '@/lib/socket';
import { VicySidebar } from '@/components/vicy/VicySidebar';
import { VicyRecentsPanel } from '@/components/vicy/VicyRecentsPanel';

export default function VicyLayout({ children }: { children: React.ReactNode }) {
  const [isRecentsOpen, setIsRecentsOpen] = useState(false);

  return (
    <WorkspaceProvider>
      <ShellProvider>
        <InboxSocketProvider>
          <div className="vicy-theme flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--vicy-bg)' }}>
            {/* Minimal Icon-Rail Sidebar */}
            <VicySidebar
              onToggleRecents={() => setIsRecentsOpen(!isRecentsOpen)}
              isRecentsOpen={isRecentsOpen}
            />

            {/* Recents Slide-Out Panel */}
            {isRecentsOpen && (
              <VicyRecentsPanel onClose={() => setIsRecentsOpen(false)} />
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {children}
            </main>
          </div>
        </InboxSocketProvider>
      </ShellProvider>
    </WorkspaceProvider>
  );
}
