/**
 * User Profile Box - Apple-Inspired Design
 * Displays user avatar, name, and level badge
 * Used in Topbar across all pages
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Settings,
  LogOut,
  User,
  Sparkles,
  Crown,
  Zap,
  Star,
  Trophy,
  Flame
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserProfile {
  id?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
}

interface UserProfileBoxProps {
  className?: string;
}

// Level configuration
const LEVELS = [
  { level: 1, title: 'Starter', icon: Star, color: 'from-zinc-400 to-zinc-500', minXp: 0 },
  { level: 2, title: 'Explorer', icon: Zap, color: 'from-emerald-400 to-emerald-600', minXp: 100 },
  { level: 3, title: 'Builder', icon: Flame, color: 'from-blue-400 to-blue-600', minXp: 300 },
  { level: 4, title: 'Expert', icon: Sparkles, color: 'from-violet-400 to-violet-600', minXp: 600 },
  { level: 5, title: 'Master', icon: Crown, color: 'from-amber-400 to-amber-600', minXp: 1000 },
  { level: 6, title: 'Legend', icon: Trophy, color: 'from-rose-400 to-rose-600', minXp: 2000 },
];

function getLevelInfo(level: number) {
  return LEVELS.find(l => l.level === level) || LEVELS[0];
}

function calculateLevel(xp: number): { level: number; xpInLevel: number; xpToNext: number } {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }

  const xpInLevel = xp - currentLevel.minXp;
  const xpToNext = nextLevel.minXp - currentLevel.minXp;

  return {
    level: currentLevel.level,
    xpInLevel,
    xpToNext: xpToNext || 1000, // Default for max level
  };
}

export function UserProfileBox({ className = '' }: UserProfileBoxProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          // Calculate level from XP or use provided level
          const xp = data.xp || data.totalXp || 450; // Default XP for demo
          const levelData = calculateLevel(xp);
          setProfile({
            ...data,
            level: data.level || levelData.level,
            xp: xp,
            xpToNextLevel: levelData.xpToNext,
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="w-20 h-9 bg-zinc-800/50 rounded-full animate-pulse" />
      </div>
    );
  }

  const initials = (profile?.displayName || profile?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const levelInfo = getLevelInfo(profile?.level || 1);
  const LevelIcon = levelInfo.icon;
  const xpProgress = profile?.xp && profile?.xpToNextLevel
    ? Math.min((profile.xp % (profile.xpToNextLevel || 100)) / (profile.xpToNextLevel || 100) * 100, 100)
    : 45; // Default progress for demo

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Level Badge */}
      <div className="relative group">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r ${levelInfo.color} bg-opacity-10 border border-white/10 cursor-pointer transition-all duration-200 hover:scale-105`}
          title={`Level ${profile?.level || 1} - ${levelInfo.title}`}
        >
          <LevelIcon className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-bold text-white">{profile?.level || 1}</span>
        </div>

        {/* Level Tooltip */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-xl min-w-[160px]">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg bg-gradient-to-r ${levelInfo.color}`}>
                <LevelIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{levelInfo.title}</p>
                <p className="text-[10px] text-zinc-500">Level {profile?.level || 1}</p>
              </div>
            </div>
            {/* XP Progress Bar */}
            <div className="space-y-1">
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${levelInfo.color} transition-all duration-500`}
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 text-center">
                {Math.round(xpProgress)}% zum nächsten Level
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all duration-200 group active:scale-[0.98]">
            {/* Avatar */}
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName || 'User'}
                className="h-7 w-7 rounded-full object-cover ring-2 ring-zinc-700/50"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center ring-2 ring-zinc-700/50">
                <span className="text-[10px] font-semibold text-white">{initials}</span>
              </div>
            )}

            {/* Name (hidden on mobile) */}
            <span className="hidden sm:block text-sm font-medium text-zinc-300 group-hover:text-white transition-colors max-w-[100px] truncate">
              {profile?.displayName || 'User'}
            </span>

            <ChevronDown className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-64 p-1.5 bg-zinc-900/95 backdrop-blur-xl border-zinc-800 rounded-xl shadow-xl shadow-black/20"
        >
          {/* User Info Header */}
          <div className="px-3 py-3 mb-1">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || 'User'}
                  className="h-10 w-10 rounded-xl object-cover ring-2 ring-zinc-700/50"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center ring-2 ring-zinc-700/50">
                  <span className="text-sm font-semibold text-white">{initials}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile?.displayName || 'User'}
                </p>
                <p className="text-xs text-zinc-500 truncate">{profile?.email}</p>
              </div>
            </div>

            {/* Level Progress */}
            <div className="mt-3 p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`p-1 rounded-md bg-gradient-to-r ${levelInfo.color}`}>
                    <LevelIcon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-white">{levelInfo.title}</span>
                </div>
                <span className="text-xs text-zinc-500">Lvl {profile?.level || 1}</span>
              </div>
              <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${levelInfo.color} transition-all duration-500`}
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>

          <DropdownMenuSeparator className="bg-zinc-800/50 my-1" />

          {/* Menu Items */}
          <DropdownMenuItem
            onClick={() => router.push('/settings')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/50 cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="font-medium">Profil</p>
              <p className="text-xs text-zinc-500">Profil bearbeiten</p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push('/settings')}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/50 cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Settings className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <p className="font-medium">Einstellungen</p>
              <p className="text-xs text-zinc-500">Konto verwalten</p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-zinc-800/50 my-1" />

          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="font-medium">{isLoggingOut ? 'Wird abgemeldet...' : 'Abmelden'}</p>
              <p className="text-xs text-red-400/60">Sitzung beenden</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
