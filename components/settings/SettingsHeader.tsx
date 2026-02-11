/**
 * Settings Header - Clean, Minimal Design
 * Focused header with user info and quick actions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileResponse } from '@/lib/profile/schemas';
import { LogOut, ChevronDown, Crown, Shield, Mail } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SettingsHeaderProps {
  profile: ProfileResponse;
  onLogout?: () => void;
}

export default function SettingsHeader({ profile, onLogout }: SettingsHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    if (onLogout) {
      onLogout();
    } else {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('[LOGOUT] Error:', error);
      }
      window.location.href = '/login';
    }
    setIsLoggingOut(false);
  };

  const initials = (profile.displayName || profile.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isAdmin = profile.roles?.includes('admin');
  const isEmailVerified = profile.emailVerified;

  return (
    <div className="flex items-center justify-between">
      {/* Left: Title & Subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[var(--vicy-text-primary)] tracking-tight">
          Einstellungen
        </h1>
        <p className="text-sm text-[var(--vicy-text-secondary)]">
          Verwalte dein Konto, Sicherheit und Präferenzen
        </p>
      </div>

      {/* Right: User Profile Card */}
      <div className="flex items-center gap-4">
        {/* Status Badges */}
        <div className="hidden md:flex items-center gap-2">
          {/* Pro Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Crown className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-400">Pro</span>
          </div>

          {/* Email Verified Badge */}
          {isEmailVerified && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Mail className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Verifiziert</span>
            </div>
          )}

          {/* Admin Badge */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Admin</span>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-1 pr-3 py-1 rounded-xl bg-[var(--vicy-surface)] border border-[var(--vicy-border)] hover:bg-[var(--vicy-surface-hover)] hover:border-[var(--vicy-accent-30)] transition-all group">
              {/* Avatar */}
              <div className="relative">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName || 'User'}
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{initials}</span>
                  </div>
                )}
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--vicy-bg)]" />
              </div>

              {/* Name */}
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-[var(--vicy-text-primary)] truncate max-w-[120px]">
                  {profile.displayName || 'User'}
                </span>
                <span className="text-[11px] text-[var(--vicy-text-secondary)] truncate max-w-[120px]">
                  {profile.email}
                </span>
              </div>

              <ChevronDown className="h-4 w-4 text-[var(--vicy-text-secondary)] group-hover:text-[var(--vicy-text-primary)] transition-colors" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 p-1.5 bg-[var(--vicy-surface)] backdrop-blur-xl border-[var(--vicy-border)] rounded-xl shadow-2xl"
          >
            {/* User Info */}
            <div className="px-3 py-2.5 mb-1">
              <div className="flex items-center gap-3">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{initials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--vicy-text-primary)] truncate">{profile.displayName}</p>
                  <p className="text-xs text-[var(--vicy-text-secondary)] truncate">{profile.email}</p>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-[var(--vicy-border)]" />

            <DropdownMenuItem
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 rounded-lg text-sm text-[var(--vicy-text-secondary)] hover:text-[var(--vicy-text-primary)] hover:bg-[var(--vicy-surface-hover)] cursor-pointer"
            >
              Zum Dashboard
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-[var(--vicy-border)]" />

            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Abmelden...' : 'Abmelden'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
