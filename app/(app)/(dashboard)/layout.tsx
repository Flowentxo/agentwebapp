/**
 * Dashboard Layout - Shell with Sidebar and Topbar
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
import { Sidebar } from '@/components/shell/Sidebar';
import { ConditionalTopbar } from '@/components/shell/ConditionalTopbar';
import { ShellProvider } from '@/components/shell/ShellContext';
import { WorkspaceProvider } from '@/lib/contexts/workspace-context';
import { CommandPalette } from '@/components/brain/CommandPalette';
import { CommandBar } from '@/components/commands/CommandBar';
import { cn } from '@/lib/utils';

// Routes that use full immersion mode (edge-to-edge, no padding)
const IMMERSIVE_ROUTES = ['/inbox', '/agents/integrations', '/studio'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Check if current route should use immersive mode
  const isImmersive = IMMERSIVE_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  return (
    <WorkspaceProvider>
      <ShellProvider>
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <ConditionalTopbar />
            <main
              role="main"
              className={cn(
                'flex-1',
                isImmersive
                  ? 'overflow-hidden' // Full immersion - no scroll on main, children handle it
                  : 'overflow-y-auto bg-gray-100 dark:bg-background'
              )}
            >
              {children}
            </main>
          </div>
          {/* Global Command Palette (Cmd/Ctrl+K) */}
          <CommandPalette currentUser={{ role: 'admin' }} />
          {/* Revolutionary Command Bar (Cmd+K alternative) */}
          <CommandBar />
        </div>
      </ShellProvider>
    </WorkspaceProvider>
  );
}
