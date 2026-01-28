'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}

export const NavItem = forwardRef<HTMLAnchorElement, NavItemProps>(
  ({ href, label, icon: Icon, isActive, isCollapsed, onClick }, ref) => {
    const linkContent = (
      <Link
        ref={ref}
        href={href}
        onClick={onClick}
        data-nav-item
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:duration-200 motion-reduce:transition-none ${
          isActive
            ? 'bg-card text-primary border border-border'
            : 'text-muted-foreground hover:bg-card hover:text-foreground border border-transparent'
        }`}
      >
        {/* Active indicator - Glow line */}
        {isActive && (
          <div
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
            style={{ boxShadow: '0 0 12px rgba(139, 92, 246, 0.6), 0 0 4px rgba(139, 92, 246, 0.8)' }}
            aria-hidden="true"
          />
        )}

        {/* Icon */}
        <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />

        {/* Label */}
        {!isCollapsed && <span>{label}</span>}
      </Link>
    );

    // Show tooltip only when collapsed
    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              <p className="text-xs">{label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return linkContent;
  }
);

NavItem.displayName = 'NavItem';
