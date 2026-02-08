/**
 * Dashboard Layout - Vicy Shell (Icon-Rail Sidebar)
 *
 * SECURITY NOTE: Email verification is enforced in API route handlers,
 * not in this client-side layout. Each protected API route should:
 * 1. Validate the session token
 * 2. Check user.emailVerified from the database
 * 3. Return 403 if not verified
 *
 * See lib/auth/session.ts requireSession() for implementation.
 */
'use client';

import { usePathname } from 'next/navigation';
import { ShellProvider } from '@/components/shell/ShellContext';
import { WorkspaceProvider } from '@/lib/contexts/workspace-context';
import { InboxSocketProvider } from '@/lib/socket';
import { VicySidebar } from '@/components/vicy/VicySidebar';
import { CommandPalette } from '@/components/brain/CommandPalette';
import { cn } from '@/lib/utils';

// Routes that use full immersion mode (edge-to-edge, no padding)
const IMMERSIVE_ROUTES = ['/inbox', '/agents/integrations', '/studio', '/pipelines'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Check if current route should use immersive mode
  const isImmersive = IMMERSIVE_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  return (
    <WorkspaceProvider>
      <ShellProvider>
        <InboxSocketProvider>
          <div
            className="vicy-theme flex h-screen overflow-hidden"
            style={{
              display: 'flex',
              height: '100vh',
              overflow: 'hidden',
              backgroundColor: '#0A0A0A',
              color: '#FAFAFA',
            }}
          >
            {/* Vicy Icon-Rail Sidebar */}
            <VicySidebar />

            {/* Main Content */}
            <main
              role="main"
              className={cn(
                'flex-1 min-w-0 flex flex-col',
                isImmersive
                  ? 'overflow-hidden'
                  : 'overflow-y-auto'
              )}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: isImmersive ? 'hidden' : 'auto',
              }}
            >
              {children}
            </main>

            {/* Global Command Palette (Cmd/Ctrl+K) */}
            <CommandPalette currentUser={{ role: 'admin' }} />
          </div>
        </InboxSocketProvider>
      </ShellProvider>
    </WorkspaceProvider>
  );
}
