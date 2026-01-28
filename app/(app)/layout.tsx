/**
 * Root Layout for (app) Route Group
 * This is a minimal layout that only provides workspace context.
 * The Shell (Sidebar/Topbar) is now in the (dashboard) sub-group.
 * Settings pages use this clean layout without navigation chrome.
 */

import { WorkspaceProvider } from '@/lib/contexts/workspace-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      {children}
    </WorkspaceProvider>
  );
}
