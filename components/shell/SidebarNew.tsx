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
  Inbox,
  Brain,
  Bot,
  Zap,
  FolderKanban,
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
} from 'lucide-react';
import { useShell } from './ShellContext';
import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';

interface NavItemConfig {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

interface NavSection {
  section: string;
  items: NavItemConfig[];
}

const navigationItems: NavSection[] = [
  {
    section: 'Übersicht',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/inbox', label: 'Inbox', icon: Inbox, badge: 3 },
    ],
  },
  {
    section: 'Agents',
    items: [
      { href: '/revolution', label: 'Revolution', icon: Zap },
      { href: '/agents/my-agents', label: 'Meine Agents', icon: FolderKanban },
      { href: '/agents/studio', label: 'Agent erstellen', icon: Workflow },
    ],
  },
  {
    section: 'Automatisierung',
    items: [
      { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
      { href: '/agents/integrations', label: 'Integrationen', icon: Plug },
      { href: '/brain', label: 'Brain AI', icon: Brain },
    ],
  },
];

const managementItems: NavItemConfig[] = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/budget', label: 'Budget', icon: DollarSign },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export function SidebarNew() {
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

  // Apple-style Nav Item Component
  const NavItem = ({ item, collapsed = false }: { item: NavItemConfig; collapsed?: boolean }) => {
    const isActive = isActiveRoute(item.href);
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        onMouseEnter={() => setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`
          group relative flex items-center gap-3 px-3 py-2 rounded-xl
          transition-colors duration-150
          ${collapsed ? 'justify-center' : ''}
          ${isActive
            ? 'bg-card/10 text-white'
            : 'text-white/60 hover:text-white hover:bg-card/5'
          }
        `}
      >
        <div className={`flex items-center justify-center w-5 h-5 ${isActive ? 'text-indigo-400' : ''}`}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
        </div>

        {!collapsed && (
          <>
            <span className={`text-[13px] font-medium flex-1 ${isActive ? 'text-white' : ''}`}>
              {item.label}
            </span>

            {/* Badge */}
            {item.badge && item.badge > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-indigo-500 text-[10px] font-semibold text-white">
                {item.badge}
              </span>
            )}
          </>
        )}

        {/* Tooltip for collapsed state */}
        {collapsed && hoveredItem === item.href && (
          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-zinc-800 rounded-lg text-xs font-medium text-white whitespace-nowrap z-50 shadow-xl border border-white/10">
            {item.label}
            {item.badge && item.badge > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-500 text-[10px]">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </Link>
    );
  };

  // Desktop Sidebar
  const desktopSidebar = (
    <motion.nav
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex h-screen flex-col bg-[#161618] border-r border-white/[0.06] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center h-14 px-4 border-b border-white/[0.06]">
        <AnimatePresence mode="wait">
          {!sidebarCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 flex-1"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <span className="text-sm font-bold text-white">F</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Flowent</span>
                <span className="text-[10px] text-white/40">AI Agents</span>
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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <span className="text-sm font-bold text-white">F</span>
              </div>
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-card/5 transition-colors"
                title="Sidebar erweitern"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-card/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-card/[0.03] border border-white/[0.06] text-white/40 hover:bg-card/[0.05] hover:border-white/10 transition-all"
          >
            <Search className="w-4 h-4" />
            <span className="text-[13px] flex-1 text-left">Suchen...</span>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-card/[0.06] text-[10px] font-medium">
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

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 scrollbar-none">
        {navigationItems.map((section) => (
          <div key={section.section}>
            {!sidebarCollapsed && (
              <h3 className="px-3 mb-2 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
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

      {/* Management Section */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        {!sidebarCollapsed && (
          <h3 className="px-3 mb-2 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
            Management
          </h3>
        )}
        <div className="space-y-0.5">
          {managementItems.map((item) => (
            <NavItem key={item.href} item={item} collapsed={sidebarCollapsed} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        {!sidebarCollapsed ? (
          <div className="space-y-0.5">
            <Link
              href="/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                pathname === '/settings'
                  ? 'bg-card/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-card/5'
              }`}
            >
              <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Einstellungen</span>
            </Link>

            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-card/5 transition-all"
            >
              <HelpCircle className="w-[18px] h-[18px]" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">Hilfe & Support</span>
            </button>

            {/* User Profile */}
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-card/5 transition-all cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                  LE
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">Luis E.</p>
                  <p className="text-[11px] text-white/40 truncate">Pro Plan</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* User Avatar */}
            <div className="flex items-center justify-center p-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                LE
              </div>
            </div>

            <Link
              href="/settings"
              className="flex items-center justify-center p-2 rounded-xl text-white/60 hover:text-white hover:bg-card/5 transition-all"
              title="Einstellungen"
            >
              <Settings className="w-[18px] h-[18px]" />
            </Link>
          </div>
        )}
      </div>

      {/* Version Tag */}
      {!sidebarCollapsed && (
        <div className="px-6 py-2 text-[10px] text-white/20">
          v2.0.0 · Flowent AI
        </div>
      )}
    </motion.nav>
  );

  // Mobile Overlay
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
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-[#161618] border-r border-white/[0.06] lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <span className="text-sm font-bold text-white">F</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Flowent</span>
                  <span className="text-[10px] text-white/40">AI Agents</span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-card/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-3 py-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card/[0.03] border border-white/[0.06] text-white/40"
              >
                <Search className="w-4 h-4" />
                <span className="text-[13px]">Suchen...</span>
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
              {navigationItems.map((section) => (
                <div key={section.section}>
                  <h3 className="px-3 mb-2 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                    {section.section}
                  </h3>
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavItem key={item.href} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Management */}
            <div className="px-3 py-3 border-t border-white/[0.06]">
              <h3 className="px-3 mb-2 text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                Management
              </h3>
              <div className="space-y-0.5">
                {managementItems.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-3 py-3 border-t border-white/[0.06]">
              <Link
                href="/settings"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-card/5 transition-all"
              >
                <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span className="text-[13px] font-medium">Einstellungen</span>
              </Link>

              {/* User Profile */}
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                    LE
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-white">Luis E.</p>
                    <p className="text-[11px] text-white/40">Pro Plan</p>
                  </div>
                  <button className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-card/5">
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
