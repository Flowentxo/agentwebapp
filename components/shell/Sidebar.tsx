'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Workflow,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Brain,
  Bot,
  DollarSign,
  Plug,
  GitBranch,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Bell,
  Search,
  Command,
  Users,
  BookOpen,
  ExternalLink,
  Inbox,
} from 'lucide-react';
import { useShell } from './ShellContext';
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';

interface NavItemConfig {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  openInNewTab?: boolean; // For standalone pages like Inbox
}

interface NavSection {
  section: string;
  items: NavItemConfig[];
}

const navigationItems: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Agents',
    items: [
      { href: '/inbox', label: 'Inbox', icon: Inbox },
      { href: '/studio', label: 'Pipeline Studio', icon: Workflow },
    ],
  },
  {
    section: 'Automation',
    items: [
      { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
      { href: '/agents/integrations', label: 'Integrations', icon: Plug },
      { href: '/brain', label: 'Brain AI', icon: Brain },
    ],
  },
];

const managementItems: NavItemConfig[] = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/budget', label: 'Budget', icon: DollarSign },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useShell();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen, setSidebarOpen]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Vibrant Enterprise Nav Item Component
  // Bold active states with border-left-4, hover with translateX
  const NavItem = ({ item, collapsed = false }: { item: NavItemConfig; collapsed?: boolean }) => {
    const isActive = isActiveRoute(item.href);
    const Icon = item.icon;

    // Handle click for items that should open in new tab
    const handleClick = (e: React.MouseEvent) => {
      if (item.openInNewTab) {
        e.preventDefault();
        window.open(item.href, '_blank', 'noopener,noreferrer');
      }
      setSidebarOpen(false);
    };

    return (
      <Link
        href={item.href}
        onClick={handleClick}
        onMouseEnter={() => setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`
          group relative flex items-center gap-3 px-3 py-2.5 rounded-lg
          transition-all duration-200 ease-out
          ${collapsed ? 'justify-center' : ''}
          ${isActive
            ? 'bg-gray-100 dark:bg-white/[0.06] text-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/[0.04]'
          }
        `}
      >
        <div className={`flex items-center justify-center w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 1.75} />
        </div>

        {!collapsed && (
          <>
            <span className={`text-[13px] flex-1 transition-colors ${isActive ? 'font-semibold text-foreground' : 'font-medium'}`}>
              {item.label}
            </span>

            {/* External Link Indicator for new tab items */}
            {item.openInNewTab && (
              <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
            )}

            {/* Badge - vibrant primary */}
            {item.badge && item.badge > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm shadow-primary/25">
                {item.badge}
              </span>
            )}
          </>
        )}

        {/* Tooltip for collapsed state */}
        {collapsed && hoveredItem === item.href && (
          <div className="absolute left-full ml-3 px-3 py-2 bg-popover rounded-lg text-xs font-semibold text-foreground whitespace-nowrap z-50 shadow-xl border-2 border-border">
            {item.label}
            {item.openInNewTab && (
              <ExternalLink className="inline w-3 h-3 ml-1.5 text-primary" />
            )}
            {item.badge && item.badge > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  // Desktop Sidebar - Premium Glass Design
  const desktopSidebar = (
    <motion.nav
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex h-screen flex-col bg-white dark:bg-zinc-900/30 dark:backdrop-blur-xl border-r border-gray-200 dark:border-white/[0.04] shadow-[2px_0_8px_rgba(0,0,0,0.04)] dark:shadow-none overflow-hidden"
    >
      {/* Header - Premium Glass */}
      <div className="flex items-center h-14 px-4 border-b border-gray-200 dark:border-white/[0.04] bg-transparent">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 flex-1"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-primary/20">
                <span className="text-sm font-black text-white">F</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground tracking-tight">Flowent</span>
                <span className="text-[10px] font-medium text-primary">AI Agents</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex items-center justify-between px-1"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-primary/20">
                <span className="text-sm font-black text-white">F</span>
              </div>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-gray-100 dark:hover:bg-primary/10 transition-all"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-gray-100 dark:hover:bg-primary/10 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Bar - Premium Glass */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg
              bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]
              text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-foreground
              transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            <span className="text-[13px] flex-1 text-left font-medium">Search...</span>
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-white/[0.04] text-[10px] font-bold text-muted-foreground">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </button>
        </div>
      )}

      {/* Workspace Switcher */}
      {!sidebarCollapsed && (
        <div className="px-3 pb-2">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Navigation - Premium Glass */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-none">
        {navigationItems.map((section) => (
          <div key={section.section}>
            {!sidebarCollapsed && (
              <h3 className="px-3 mb-2.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                {section.section}
              </h3>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Management Section - Premium */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-white/[0.04] bg-transparent">
        {!sidebarCollapsed && (
          <h3 className="px-3 mb-2.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
            Management
          </h3>
        )}
        <div className="space-y-0.5">
          {managementItems.map((item) => (
            <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}
        </div>
      </div>

      {/* Footer - Premium Glass */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-white/[0.04] bg-transparent">
        {!sidebarCollapsed ? (
          <div className="space-y-0.5">
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                pathname === '/settings'
                  ? 'bg-gray-100 dark:bg-white/[0.06] text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Settings className="w-[18px] h-[18px]" strokeWidth={pathname === '/settings' ? 2 : 1.75} />
              <span className="text-[13px] font-medium">Settings</span>
            </Link>

            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all duration-200"
            >
              <HelpCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
              <span className="text-[13px] font-medium">Help & Support</span>
            </button>

            {/* User Profile - Premium */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/[0.04]">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all cursor-pointer group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/20">
                  LE
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">Luis E.</p>
                  <p className="text-[11px] font-medium text-primary truncate">Pro Plan</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* User Avatar */}
            <div className="flex items-center justify-center p-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/20">
                LE
              </div>
            </div>

            <Link
              href="/settings"
              className="flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-gray-100 dark:hover:bg-primary/10 transition-all"
              title="Settings"
            >
              <Settings className="w-[18px] h-[18px]" />
            </Link>
          </div>
        )}
      </div>

      {/* Version Tag - Vibrant */}
      {!sidebarCollapsed && (
        <div className="px-6 py-2 text-[10px] font-medium text-primary/50">
          v2.0.0 · Flowent AI
        </div>
      )}
    </motion.nav>
  );

  // Mobile Overlay - Vibrant Enterprise
  const mobileOverlay = (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar - Vibrant */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-background border-r-2 border-border lg:hidden"
          >
            {/* Header - Vibrant */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-primary/20">
                  <span className="text-sm font-black text-primary-foreground">F</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground tracking-tight">Flowent</span>
                  <span className="text-[10px] font-medium text-primary">AI Agents</span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search - Vibrant */}
            <div className="px-3 py-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-card border-2 border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
              >
                <Search className="w-4 h-4" />
                <span className="text-[13px] font-medium">Suchen...</span>
              </button>
            </div>

            {/* Navigation - Vibrant */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
              {navigationItems.map((section) => (
                <div key={section.section}>
                  <h3 className="px-3 mb-2.5 text-[11px] font-bold text-primary/70 uppercase tracking-wider">
                    {section.section}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavItem key={item.href} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Management - Vibrant */}
            <div className="px-3 py-3 border-t border-border bg-card/50">
              <h3 className="px-3 mb-2.5 text-[11px] font-bold text-primary/70 uppercase tracking-wider">
                Management
              </h3>
              <div className="space-y-1">
                {managementItems.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
            </div>

            {/* Footer - Vibrant */}
            <div className="px-3 py-3 border-t border-border bg-card">
              <Link
                href="/settings"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted hover:translate-x-1 transition-all duration-200 border-l-4 border-transparent"
              >
                <Settings className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span className="text-[13px] font-medium">Einstellungen</span>
              </Link>

              {/* User Profile - Vibrant */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg group">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/20">
                    LE
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">Luis E.</p>
                    <p className="text-[11px] font-medium text-primary">Pro Plan</p>
                  </div>
                  <button className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {desktopSidebar}
      {mobileOverlay}
    </>
  );
}
