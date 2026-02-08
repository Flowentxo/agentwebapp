'use client';

import { WorkspaceProvider } from '@/lib/contexts/workspace-context';
import { ShellProvider } from '@/components/shell/ShellContext';
import { InboxSocketProvider } from '@/lib/socket';
import { VicySidebar } from '@/components/vicy/VicySidebar';

export default function VicyLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <ShellProvider>
        <InboxSocketProvider>
          <div className="vicy-theme flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--vicy-bg)' }}>
            {/* Minimal Icon-Rail Sidebar */}
            <VicySidebar />

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
