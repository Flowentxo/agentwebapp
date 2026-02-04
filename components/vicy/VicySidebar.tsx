'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Clock,
  Compass,
  Settings,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInboxStore } from '@/lib/stores/useInboxStore';

interface VicySidebarProps {
  onToggleRecents?: () => void;
  isRecentsOpen?: boolean;
}

export function VicySidebar({ onToggleRecents, isRecentsOpen }: VicySidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUiVersion } = useInboxStore();

  const handleNewSession = () => {
    router.push('/v4');
  };

  const handleSwitchToClassic = () => {
    setUiVersion('classic');
    router.push('/inbox');
  };

  const isHome = pathname === '/v4';

  return (
    <nav className="flex flex-col items-center w-14 h-full py-4 border-r flex-shrink-0"
      style={{
        backgroundColor: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'var(--vicy-border)',
      }}
    >
      {/* Logo */}
      <Link
        href="/v4"
        className="vicy-icon-btn mb-6"
        title="Flowent AI"
      >
        <Sparkles className="w-5 h-5 text-violet-400" />
      </Link>

      {/* Main Actions */}
      <div className="flex flex-col items-center gap-1.5">
        {/* New Session */}
        <button
          onClick={handleNewSession}
          className={cn('vicy-icon-btn', isHome && 'active')}
          title="New Session"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>

        {/* Recents */}
        <button
          onClick={onToggleRecents}
          className={cn('vicy-icon-btn', isRecentsOpen && 'active')}
          title="Recent Conversations"
        >
          <Clock className="w-4.5 h-4.5" />
        </button>

        {/* Explore Agents */}
        <Link
          href="/agents/browse"
          className="vicy-icon-btn"
          title="Explore Agents"
        >
          <Compass className="w-4.5 h-4.5" />
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-1.5">
        {/* Settings */}
        <Link
          href="/settings"
          className="vicy-icon-btn"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* Switch to Classic */}
        <button
          onClick={handleSwitchToClassic}
          className="vicy-icon-btn"
          title="Switch to Classic View"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
