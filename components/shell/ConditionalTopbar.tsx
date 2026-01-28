'use client';

import { usePathname } from 'next/navigation';
import { Topbar } from './Topbar';

// Routes where the main Topbar should be hidden (these have their own header)
const HIDDEN_TOPBAR_ROUTES = [
  '/settings',
  '/dashboard',
  '/agents/integrations',
  '/agents/my-agents',
  '/brain',
  '/pipelines',
  '/analytics',
  '/budget',
  '/inbox', // Inbox has integrated header controls - full immersion mode
];

export function ConditionalTopbar() {
  const pathname = usePathname();

  // Check if current path starts with any hidden route
  const shouldHideTopbar = HIDDEN_TOPBAR_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (shouldHideTopbar) {
    return null;
  }

  return <Topbar />;
}
