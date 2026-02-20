'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Compass,
  Settings,
  Sparkles,
  Workflow,
  Inbox,
  GitBranch,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  icon: React.ElementType;
  title: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/inbox', icon: Inbox, title: 'Zentrale' },
  { href: '/agents/browse', icon: Compass, title: 'Agenten' },
  { href: '/studio', icon: Workflow, title: 'Studio' },
  { href: '/pipelines', icon: GitBranch, title: 'Pipelines' },
  { href: '/brain', icon: Brain, title: 'Wissen' },
];

export function VicySidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const handleNewSession = () => {
    router.push('/v4');
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isHome = pathname === '/v4';

  // Inline icon button style for CSS resilience
  const iconBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    color: '#71717A',
    transition: 'all 0.15s ease',
    textDecoration: 'none',
  };

  const iconBtnActiveStyle: React.CSSProperties = {
    ...iconBtnStyle,
    color: '#c4b5fd',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    boxShadow: '0 0 12px rgba(139, 92, 246, 0.08)',
  };

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className="flex flex-col items-center w-14 h-full py-4 border-r flex-shrink-0"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '56px',
          height: '100%',
          paddingTop: '16px',
          paddingBottom: '16px',
          flexShrink: 0,
          backgroundColor: 'rgba(10, 12, 20, 0.98)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/v4"
              className={cn('vicy-icon-btn mb-4', isHome && 'active')}
              style={{ ...iconBtnStyle, marginBottom: '16px', ...(isHome ? iconBtnActiveStyle : {}) }}
            >
              <Sparkles className="w-5 h-5 text-violet-400" style={{ width: '20px', height: '20px', color: '#a78bfa' }} />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <span className="text-xs font-medium">Flowent AI</span>
          </TooltipContent>
        </Tooltip>

        {/* New Session */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleNewSession}
              className="vicy-icon-btn mb-3"
              style={{ ...iconBtnStyle, marginBottom: '12px', border: 'none', cursor: 'pointer', background: 'transparent' }}
            >
              <Plus className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <span className="text-xs font-medium">Neue Sitzung</span>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div
          className="w-6 h-px mb-3"
          style={{ width: '24px', height: '1px', marginBottom: '12px', backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
        />

        {/* Nav Items */}
        <div className="flex flex-col items-center gap-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          {NAV_ITEMS.map(({ href, icon: Icon, title }) => (
            <Tooltip key={title}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn('vicy-icon-btn', isActive(href) && 'active')}
                  style={
                    isActive(href)
                      ? iconBtnActiveStyle
                      : hoveredItem === href
                      ? { ...iconBtnStyle, backgroundColor: 'rgba(255, 255, 255, 0.06)' }
                      : iconBtnStyle
                  }
                  onMouseEnter={() => setHoveredItem(href)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Icon className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <span className="text-xs font-medium">{title}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" style={{ flex: 1 }} />

        {/* Settings */}
        <div className="flex flex-col items-center gap-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn('vicy-icon-btn', isActive('/settings') && 'active')}
                style={isActive('/settings') ? iconBtnActiveStyle : iconBtnStyle}
              >
                <Settings className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <span className="text-xs font-medium">Einstellungen</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}
