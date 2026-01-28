'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Bot,
  Star,
  Crown,
  Sparkles,
  Flame,
  Trophy,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Zap,
  CheckCircle,
  XCircle,
  Info,
  Coins,
  ListTodo,
  Heart,
  ChevronRight,
  Key,
} from 'lucide-react';
import { useAgents } from '@/lib/hooks/useAgents';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Dashboard Components
import { CommandBar } from '@/components/dashboard/CommandBar';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { KnowledgeBaseCard } from '@/components/dashboard/KnowledgeBaseCard';
import { AgentDrawer } from '@/components/dashboard/AgentDrawer';
import { KnowledgeModal } from '@/components/dashboard/KnowledgeModal';
import { CreateAgentModal } from '@/components/dashboard/CreateAgentModal';
import { ApiSettingsModal } from '@/components/dashboard/ApiSettingsModal';
import { ActivePipelinesWidget } from '@/components/dashboard/ActivePipelinesWidget';
import { PendingApprovalsWidget } from '@/components/dashboard/PendingApprovalsWidget';

// Zustand Store
import {
  useDashboardStore,
  useAgents as useStoreAgents,
  useLogs,
  useToasts,
  useTotalAgents,
  useActiveAgents,
  usePendingJobs,
  useTokenUsage,
  useSystemHealth,
  useHasApiKey,
  COMMAND_SUGGESTIONS,
  type DashboardAgent,
} from '@/store/useDashboardStore';

// Types
import type { LogEntry } from '@/components/dashboard/types';

// ============================================================================
// TYPES
// ============================================================================

interface UserProfile {
  id?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVELS = [
  { level: 1, title: 'Starter', icon: Star, color: 'from-zinc-400 to-zinc-500', minXp: 0 },
  { level: 2, title: 'Explorer', icon: Zap, color: 'from-emerald-400 to-emerald-600', minXp: 100 },
  { level: 3, title: 'Builder', icon: Flame, color: 'from-blue-400 to-blue-600', minXp: 300 },
  { level: 4, title: 'Expert', icon: Sparkles, color: 'from-violet-400 to-violet-600', minXp: 600 },
  { level: 5, title: 'Master', icon: Crown, color: 'from-amber-400 to-amber-600', minXp: 1000 },
  { level: 6, title: 'Legend', icon: Trophy, color: 'from-rose-400 to-rose-600', minXp: 2000 },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getLevelInfo(level: number) {
  return LEVELS.find((l) => l.level === level) || LEVELS[0];
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
    xpToNext: xpToNext || 1000,
  };
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// ============================================================================
// TOAST COMPONENT - Extended to support warning type
// ============================================================================

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}) {
  const styles: Record<string, string> = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  };

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl border backdrop-blur-xl ${styles[type]} z-50 shadow-xl`}
    >
      <div className="flex items-center gap-3">
        {type === 'success' && <CheckCircle className="w-5 h-5" />}
        {type === 'error' && <XCircle className="w-5 h-5" />}
        {type === 'info' && <Info className="w-5 h-5" />}
        {type === 'warning' && <AlertTriangle className="w-5 h-5" />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// AGENT CARD MOBILE COMPONENT - With Working State Visuals
// ============================================================================

function AgentCardMobile({ agent, onClick }: { agent: DashboardAgent; onClick: () => void }) {
  const isWorking = agent.status === 'working';

  const statusColors: Record<string, string> = {
    working: 'bg-blue-500 animate-pulse',
    idle: 'bg-green-500',
    paused: 'bg-yellow-500',
    offline: 'bg-zinc-500',
    error: 'bg-red-500',
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isWorking
          ? 'bg-blue-500/10 border-blue-500/30'
          : 'bg-card border-border hover:border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar with Working Animation */}
          <div
            className={`relative flex h-12 w-12 items-center justify-center rounded-xl border ${
              isWorking ? 'animate-pulse' : ''
            }`}
            style={{
              backgroundColor: `${agent.color}15`,
              borderColor: isWorking ? agent.color : `${agent.color}30`,
              boxShadow: isWorking ? `0 0 15px ${agent.color}30` : 'none',
            }}
          >
            <Bot className="w-6 h-6" style={{ color: agent.color }} />
            {isWorking && (
              <span
                className="absolute inset-0 rounded-xl animate-ping opacity-20"
                style={{ backgroundColor: agent.color }}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={`font-semibold ${isWorking ? 'text-blue-500 dark:text-blue-300' : 'text-foreground'}`}>
                {agent.name}
              </p>
              {isWorking && (
                <span className="px-1.5 py-0.5 rounded text-[8px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  WORKING
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isWorking && agent.currentTask
                ? agent.currentTask.slice(0, 20) + '...'
                : agent.role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${statusColors[agent.status] || 'bg-zinc-500'}`} />
          <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded-lg bg-muted">
          <p className="text-lg font-bold text-foreground tabular-nums">
            {formatNumber(agent.requests24h)}
          </p>
          <p className="text-[10px] text-muted-foreground">Requests</p>
        </div>
        <div className="p-2 rounded-lg bg-muted">
          <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
            {agent.successRate24h.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">Success Rate</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<DashboardAgent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [isCreateAgentModalOpen, setIsCreateAgentModalOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Handler to open agent drawer
  const handleAgentClick = useCallback((agent: DashboardAgent) => {
    setSelectedAgent(agent);
    setIsDrawerOpen(true);
  }, []);

  // Handler to close agent drawer
  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    // Delay clearing the agent to allow exit animation
    setTimeout(() => setSelectedAgent(null), 300);
  }, []);

  // Handler for agent creation success (with confetti)
  const handleAgentCreated = useCallback((agentId: string) => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  // Zustand store - get agents, logs, toasts, and stable stats selectors
  const storeAgents = useStoreAgents();
  const storeLogs = useLogs();
  const storeToasts = useToasts();
  const isProcessing = useDashboardStore((state) => state.isProcessing);
  const addToast = useDashboardStore((state) => state.addToast);
  const removeToast = useDashboardStore((state) => state.removeToast);
  const addLog = useDashboardStore((state) => state.addLog);

  // Stable scalar selectors for stats (avoid object creation & infinite loops)
  const totalAgents = useTotalAgents();
  const activeAgents = useActiveAgents();
  const pendingJobs = usePendingJobs();
  const tokenUsage = useTokenUsage();
  const systemHealth = useSystemHealth();
  const hasApiKey = useHasApiKey();

  // Use React-Query hook for API agents (optional, can be disabled)
  const { data, isLoading, error, refetch } = useAgents({
    refetchInterval: 30000,
  });

  // Use store agents (which update in real-time)
  const agents = storeAgents;

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          const xp = data.xp || data.totalXp || 450;
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
      }
    };
    fetchProfile();
  }, []);

  // Handle load more activities (now uses store)
  const handleLoadMoreActivities = useCallback(() => {
    addLog({
      type: 'success',
      status: 'completed',
      message: 'Aura: Brand report generated',
      agent: 'Aura',
      agentColor: '#EC4899',
    });
    addToast({ message: 'Loaded more activities', type: 'info' });
  }, [addLog, addToast]);

  // Handle retry (now uses store)
  const handleRetry = useCallback((entry: LogEntry) => {
    console.log('[RETRY]', entry);
    addToast({ message: `Retrying: ${entry.message}`, type: 'info' });
  }, [addToast]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Profile helpers
  const initials = (profile?.displayName || profile?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const levelInfo = getLevelInfo(profile?.level || 1);
  const LevelIcon = levelInfo.icon;
  const xpProgress =
    profile?.xp && profile?.xpToNextLevel
      ? Math.min(((profile.xp % (profile.xpToNextLevel || 100)) / (profile.xpToNextLevel || 100)) * 100, 100)
      : 45;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Failed to load dashboard</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please try again</p>
          <button
            onClick={() => refetch()}
            className="mt-6 px-6 py-3 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-400 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2 inline" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dashboard-full-width">
      {/* Toast Notifications from Zustand Store */}
      <AnimatePresence>
        {storeToasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>

      {/* Header Bar with User Profile - Full Width + Aurora Gradient */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 dark:border-border bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 via-white to-white dark:from-transparent dark:via-background dark:to-background backdrop-blur-xl w-full">
        <div className="flex items-center justify-between h-16 px-4 w-full">
          {/* Left - Status */}
          <div className="flex items-center gap-3">
            {/* Subtle Status Dot */}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Operational</span>
            </div>

            {/* Subtle Refresh Button */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* AI Mode Indicator / API Settings Button - Secondary Style */}
            <button
              onClick={() => setIsApiSettingsOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                hasApiKey
                  ? 'bg-violet-500/10 border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20'
                  : 'bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] shadow-sm'
              }`}
            >
              <Key className={`h-3.5 w-3.5 ${hasApiKey ? '' : 'text-zinc-500 dark:text-zinc-400'}`} />
              {hasApiKey ? 'GPT-4 Active' : 'Add API Key'}
            </button>
          </div>

          {/* Right - Level & User Profile */}
          <div className="flex items-center gap-3">
            {/* Level Badge */}
            <div className="relative group">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r ${levelInfo.color} bg-opacity-10 border border-white/10 cursor-pointer transition-all duration-200 hover:scale-105`}
                title={`Level ${profile?.level || 1} - ${levelInfo.title}`}
              >
                <LevelIcon className="w-4 h-4 text-white" />
                <span className="text-sm font-bold text-white">{profile?.level || 1}</span>
              </div>

              {/* Level Tooltip */}
              <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                <div className="bg-popover border border-border rounded-xl p-3 shadow-xl min-w-[180px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${levelInfo.color}`}>
                      <LevelIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-popover-foreground">{levelInfo.title}</p>
                      <p className="text-[10px] text-muted-foreground">Level {profile?.level || 1}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${levelInfo.color} transition-all duration-500`}
                        style={{ width: `${xpProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {Math.round(xpProgress)}% to next level
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-muted hover:bg-muted/80 border border-border transition-all duration-200 group active:scale-[0.98]">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName || 'User'}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center ring-2 ring-border">
                      <span className="text-xs font-semibold text-white">{initials}</span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[120px] truncate">
                    {profile?.displayName || 'User'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-64 p-1.5 bg-popover backdrop-blur-xl border-border rounded-xl shadow-xl"
              >
                <div className="px-3 py-3 mb-1">
                  <div className="flex items-center gap-3">
                    {profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-xl object-cover ring-2 ring-border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center ring-2 ring-border">
                        <span className="text-sm font-semibold text-white">{initials}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {profile?.displayName || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator className="bg-border my-1" />

                <DropdownMenuItem
                  onClick={() => router.push('/settings')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Profile</p>
                    <p className="text-xs text-muted-foreground">Edit profile</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => router.push('/settings')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Settings</p>
                    <p className="text-xs text-muted-foreground">Manage account</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setIsApiSettingsOpen(true)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    hasApiKey ? 'bg-violet-500/10' : 'bg-amber-500/10'
                  }`}>
                    <Key className={`w-4 h-4 ${hasApiKey ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">API Settings</p>
                    <p className={`text-xs ${hasApiKey ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-500'}`}>
                      {hasApiKey ? 'GPT-4 active' : 'Simulation mode'}
                    </p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/[0.06] my-1" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium">{isLoggingOut ? 'Signing out...' : 'Sign out'}</p>
                    <p className="text-xs text-red-500/60 dark:text-red-400/60">End session</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width Layout */}
      <main className="px-4 py-4 space-y-4 w-full">
        {/* Quick Action Command Bar - Uses Zustand Store Directly */}
        <CommandBar useStore={true} />

        {/* Business Intelligence Stats Grid - Connected to Store - Full Width */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <MetricCard
            id="active-agents"
            label="Active Agents"
            value={`${activeAgents}/${totalAgents}`}
            icon={Bot}
            color="text-white dark:text-indigo-400"
            bgColor="bg-indigo-500 dark:bg-indigo-500/10"
            borderColor="border-indigo-500 dark:border-indigo-500/20"
            index={0}
            isLoading={isLoading}
            useStore={true}
          />
          <MetricCard
            id="pending-jobs"
            label="Pending Jobs"
            value={pendingJobs}
            icon={ListTodo}
            color="text-white dark:text-amber-400"
            bgColor="bg-amber-500 dark:bg-amber-500/10"
            borderColor="border-amber-500 dark:border-amber-500/20"
            index={1}
            isLoading={isLoading}
            useStore={true}
          />
          <MetricCard
            id="token-usage"
            label="Token Usage"
            value={formatNumber(tokenUsage)}
            icon={Coins}
            color="text-white dark:text-teal-400"
            bgColor="bg-teal-500 dark:bg-teal-500/10"
            borderColor="border-teal-500 dark:border-teal-500/20"
            trend="up"
            trendValue="+12%"
            expandable={true}
            showSparkline={true}
            sparklineColor="#14B8A6"
            index={2}
            isLoading={isLoading}
            useStore={true}
          />
          {/* Knowledge Base Card - Level 4/5 Feature - Opens Knowledge Modal */}
          <KnowledgeBaseCard
            index={3}
            isLoading={isLoading}
            onClick={() => setIsKnowledgeModalOpen(true)}
          />
        </div>

        {/* Agents List & Activity - Full Width */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          {/* Active Agents */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 rounded-2xl overflow-hidden
              bg-white dark:bg-zinc-900/40
              dark:backdrop-blur-xl
              border border-gray-200 dark:border-white/[0.06]
              shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-none
              dark:ring-1 dark:ring-inset dark:ring-white/[0.02]"
          >
            <div className="p-5 border-b border-gray-200 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-foreground flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    Active Agents
                  </h2>
                  <p className="text-xs font-medium text-gray-500 dark:text-muted-foreground mt-0.5">Real-time performance</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCreateAgentModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                      bg-primary/10 border border-primary/20
                      text-xs font-medium text-primary
                      hover:bg-primary/15 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]
                      transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Create Agent
                  </button>
                  <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] text-xs font-semibold text-zinc-600 dark:text-muted-foreground">
                    {agents.length} AGENTS
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Table View - With Working State Visuals */}
            <div className="hidden md:block divide-y divide-gray-200/60 dark:divide-white/[0.06]">
              {agents.slice(0, 5).map((agent) => {
                const isWorking = agent.status === 'working';
                return (
                  <div
                    key={agent.id}
                    onClick={() => handleAgentClick(agent)}
                    className={`group cursor-pointer p-4 transition-all hover:bg-gray-50 dark:hover:bg-muted/50 ${
                      isWorking ? 'bg-blue-50 dark:bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Agent Avatar with Working Animation */}
                        <div
                          className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${
                            isWorking ? 'animate-pulse' : ''
                          }`}
                          style={{
                            backgroundColor: `${agent.color}15`,
                            borderColor: isWorking ? agent.color : `${agent.color}30`,
                            boxShadow: isWorking ? `0 0 20px ${agent.color}40` : 'none',
                          }}
                        >
                          <Bot className="w-5 h-5" style={{ color: agent.color }} />
                          {/* Working Ring Animation */}
                          {isWorking && (
                            <span
                              className="absolute inset-0 rounded-xl animate-ping opacity-30"
                              style={{ backgroundColor: agent.color }}
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-medium transition-colors ${
                              isWorking ? 'text-blue-500 dark:text-blue-300' : 'text-foreground group-hover:text-primary'
                            }`}>
                              {agent.name}
                            </p>
                            {/* Status Badge */}
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isWorking
                                  ? 'bg-blue-500 animate-pulse'
                                  : agent.status === 'idle'
                                  ? 'bg-green-500'
                                  : agent.status === 'paused'
                                  ? 'bg-yellow-500'
                                  : agent.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-zinc-500'
                              }`}
                            />
                            {/* Working Badge */}
                            {isWorking && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                WORKING
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isWorking && agent.currentTask
                              ? agent.currentTask.slice(0, 30) + (agent.currentTask.length > 30 ? '...' : '')
                              : agent.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground tabular-nums">
                            {formatNumber(agent.requests24h)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Requests</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600 dark:text-green-400 tabular-nums">
                            {agent.successRate24h.toFixed(1)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">Success</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-3">
              {agents.slice(0, 4).map((agent) => (
                <AgentCardMobile
                  key={agent.id}
                  agent={agent}
                  onClick={() => handleAgentClick(agent)}
                />
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-white/[0.06]">
              <button
                onClick={() => router.push('/agents/browse')}
                className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border border-gray-200 dark:border-white/[0.06] text-sm text-zinc-600 dark:text-muted-foreground hover:text-zinc-900 dark:hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2"
              >
                View All Agents
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          {/* Live Activity Feed - Connected to Store */}
          <ActivityFeed
            activities={storeLogs}
            isLive={true}
            onLoadMore={handleLoadMoreActivities}
            onRetry={handleRetry}
          />
        </div>

        {/* Pipeline Automation Section - Full Width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Active Pipelines Widget - Phase 6 */}
          <ActivePipelinesWidget index={0} isLoading={isLoading} />

          {/* Pending Approvals Widget - Human-in-the-Loop */}
          <PendingApprovalsWidget index={1} isLoading={isLoading} />
        </div>
      </main>

      {/* Agent Configuration Drawer - Level 4 Feature */}
      <AgentDrawer
        agent={selectedAgent}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
      />

      {/* Knowledge Management Modal - Level 5 Feature */}
      <KnowledgeModal
        isOpen={isKnowledgeModalOpen}
        onClose={() => setIsKnowledgeModalOpen(false)}
      />

      {/* Create Agent Modal - Level 6 Feature */}
      <CreateAgentModal
        isOpen={isCreateAgentModalOpen}
        onClose={() => setIsCreateAgentModalOpen(false)}
        onAgentCreated={handleAgentCreated}
      />

      {/* API Settings Modal - Level 7 Feature */}
      <ApiSettingsModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
      />

      {/* Confetti Celebration Effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-[100]"
          >
            {/* Confetti particles */}
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 1,
                  x: '50vw',
                  y: '50vh',
                  scale: 0,
                }}
                animate={{
                  opacity: [1, 1, 0],
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  scale: [0, 1, 0.5],
                  rotate: Math.random() * 720 - 360,
                }}
                transition={{
                  duration: 2 + Math.random(),
                  ease: 'easeOut',
                  delay: Math.random() * 0.3,
                }}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: [
                    '#8B5CF6',
                    '#EC4899',
                    '#F59E0B',
                    '#10B981',
                    '#3B82F6',
                    '#EF4444',
                  ][Math.floor(Math.random() * 6)],
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
