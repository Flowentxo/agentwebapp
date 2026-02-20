'use client';

import { useEffect, useRef } from 'react';
import { WorkspaceProvider } from '@/lib/contexts/workspace-context';
import { ShellProvider } from '@/components/shell/ShellContext';
import { InboxSocketProvider } from '@/lib/socket';
import { VicySidebar } from '@/components/vicy/VicySidebar';
import { useSession } from '@/store/session';
import { Loader2 } from 'lucide-react';

export default function VicyLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchSession } = useSession();
  const redirectingRef = useRef(false);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !redirectingRef.current) {
      redirectingRef.current = true;
      // Clear everything synchronously so middleware won't bounce /login back to /v4
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      document.cookie = 'sintra.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.replace('/login?next=/v4');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: 'var(--vicy-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          <p className="text-sm text-white/40">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
