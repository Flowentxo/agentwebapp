/**
 * Settings Header - Hero Design with Ambient Glow
 * Premium header with large title, user card, and status badges
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileResponse } from '@/lib/profile/schemas';
import { LogOut, ChevronDown, Shield, Mail, Sparkles } from 'lucide-react';
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
    <div className="relative flex items-center justify-between">
      {/* Ambient glow behind title */}
      <div className="absolute -top-20 -left-10 w-72 h-72 bg-purple-600/[0.08] rounded-full blur-[100px] pointer-events-none" />

      {/* Left: Hero Title */}
      <div className="relative space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Einstellungen
        </h1>
        <p className="text-base text-zinc-400">
          Verwalte dein Konto, Sicherheit und Integrationen
        </p>
      </div>

      {/* Right: User Profile Card */}
      <div className="relative flex items-center gap-4">
        {/* Status Badges */}
        <div className="hidden md:flex items-center gap-2">
          {/* Pro Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/15 to-violet-500/15 border border-purple-500/20">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-purple-400">Pro</span>
          </div>

          {/* Email Verified Badge */}
          {isEmailVerified && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Mail className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Verifiziert</span>
            </div>
          )}

          {/* Admin Badge */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">Admin</span>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06] hover:bg-zinc-800/60 hover:border-purple-500/20 transition-all group backdrop-blur-xl">
              {/* Avatar */}
              <div className="relative">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName || 'User'}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-purple-500/20"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center ring-2 ring-purple-500/20">
                    <span className="text-xs font-bold text-white">{initials}</span>
                  </div>
                )}
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-900" />
              </div>

              {/* Name */}
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-sm font-medium text-white truncate max-w-[120px]">
                  {profile.displayName || 'User'}
                </span>
                <span className="text-[11px] text-zinc-500 truncate max-w-[120px]">
                  {profile.email}
                </span>
              </div>

              <ChevronDown className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-56 p-1.5 bg-zinc-900/95 backdrop-blur-xl border-white/[0.06] rounded-xl shadow-2xl shadow-black/40"
          >
            {/* User Info */}
            <div className="px-3 py-2.5 mb-1">
              <div className="flex items-center gap-3">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{initials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile.displayName}</p>
                  <p className="text-xs text-zinc-500 truncate">{profile.email}</p>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-white/[0.04]" />

            <DropdownMenuItem
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
            >
              Zum Dashboard
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/[0.04]" />

            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
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
