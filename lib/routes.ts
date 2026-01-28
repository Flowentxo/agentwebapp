/**
 * App Routes in (app) Route Group
 *
 * All these routes are protected by the Shell layout (Sidebar + Topbar)
 */
export const ROUTES_IN_GROUP = [
  '/dashboard',
  '/inbox',
  '/agents',
  '/revolution',
  '/pipelines',
  '/brain',
  '/budget',
  '/workflows',
  '/knowledge',
  '/analytics',
  '/board',
  '/admin',
  '/settings',
  '/automations',
  '/integrations',
  '/projects',
  '/recipes',
] as const;

export type AppRoute = (typeof ROUTES_IN_GROUP)[number];

/**
 * Routes that use Content-Only layout (no secondary sidebar)
 *
 * These routes render with just the Shell (Sidebar + Topbar) and a centered content area.
 * No AppShell, no section navigation, no secondary sidebars.
 */
export const SECTIONS_CONTENT_ONLY = [
  '/workflows',
  '/analytics',
  '/board',
  '/admin',
  '/settings',
  '/knowledge',
] as const;

export type ContentOnlyRoute = (typeof SECTIONS_CONTENT_ONLY)[number];

/**
 * Check if a route is in the (app) group
 */
export function isAppRoute(pathname: string): boolean {
  return ROUTES_IN_GROUP.some((route) => pathname.startsWith(route));
}

/**
 * Check if a route uses Content-Only layout
 */
export function isContentOnlyRoute(pathname: string): boolean {
  return SECTIONS_CONTENT_ONLY.some((route) => pathname.startsWith(route));
}
