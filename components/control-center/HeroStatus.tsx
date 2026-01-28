'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PartyPopper,
  AlertCircle,
  XCircle,
  ChevronDown,
  Sparkles,
  Clock,
  CheckCircle2,
  MessageCircle,
  Mail,
  Target,
  Zap
} from 'lucide-react';

type SystemStatus = 'excellent' | 'good' | 'attention' | 'problem';

interface TodayStats {
  tasksCompleted: number;
  hoursSaved: number;
  conversations: number;
  emailsSent: number;
  leadsFound: number;
}

interface Issue {
  agentName: string;
  agentId: string;
  count: number;
  reason?: string;
  severity: 'warning' | 'critical';
}

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  performanceScore: number;
}

interface HeroStatusProps {
  agents?: Agent[];
  todayStats?: TodayStats;
  issues?: Issue[];
}

// Animated sparkles background
function SparklesBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-green-400 rounded-full"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
          }}
        />
      ))}
    </div>
  );
}

export function HeroStatus({ agents = [], todayStats, issues = [] }: HeroStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate status
  const status = calculateOverallStatus(agents, issues);
  const activeAgents = agents.filter(a => a.status === 'active').length;

  // Default stats if none provided
  const stats: TodayStats = todayStats || {
    tasksCompleted: Math.floor(Math.random() * 150) + 50,
    hoursSaved: Math.floor(Math.random() * 8) + 2,
    conversations: Math.floor(Math.random() * 40) + 10,
    emailsSent: Math.floor(Math.random() * 25) + 5,
    leadsFound: Math.floor(Math.random() * 15) + 3,
  };

  const statusConfig = {
    excellent: {
      gradient: 'from-green-500/20 to-emerald-500/10',
      border: 'border-green-500/30',
      icon: PartyPopper,
      iconBg: 'rgba(34, 197, 94, 0.2)',
      iconColor: 'text-green-400',
      title: 'Alles läuft super! 🎉',
    },
    good: {
      gradient: 'from-blue-500/20 to-cyan-500/10',
      border: 'border-blue-500/30',
      icon: CheckCircle2,
      iconBg: 'rgba(59, 130, 246, 0.2)',
      iconColor: 'text-blue-400',
      title: 'Läuft gut! 👍',
    },
    attention: {
      gradient: 'from-yellow-500/20 to-orange-500/10',
      border: 'border-yellow-500/30',
      icon: AlertCircle,
      iconBg: 'rgba(234, 179, 8, 0.2)',
      iconColor: 'text-yellow-400',
      title: 'Ein Agent braucht deine Aufmerksamkeit',
    },
    problem: {
      gradient: 'from-red-500/20 to-rose-500/10',
      border: 'border-red-500/30',
      icon: XCircle,
      iconBg: 'rgba(239, 68, 68, 0.2)',
      iconColor: 'text-red-400',
      title: 'Es gibt ein Problem',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl p-8
        bg-gradient-to-br ${config.gradient} border ${config.border}
      `}
    >
      {status === 'excellent' && <SparklesBackground />}

      <div className="relative z-10 text-center">
        {/* Status Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: config.iconBg }}
        >
          <StatusIcon className={`w-8 h-8 ${config.iconColor}`} />
        </motion.div>

        {/* Main Message */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {config.title}
        </h2>

        {/* Subtitle - Human readable summary */}
        <p className="text-slate-300 text-lg max-w-xl mx-auto mb-6">
          {(status === 'excellent' || status === 'good') ? (
            <>
              Deine {activeAgents || 3} Agents haben heute schon{' '}
              <span className="font-semibold text-white">{stats.tasksCompleted} Aufgaben</span> erledigt.
              {stats.hoursSaved > 0 && (
                <> Das sind etwa <span className="font-semibold text-green-400">{formatHours(stats.hoursSaved)}</span> Arbeit, die du gespart hast!</>
              )}
            </>
          ) : status === 'attention' ? (
            <>
              {issues[0]?.agentName || 'Ein Agent'} konnte{' '}
              <span className="font-semibold text-yellow-400">{issues[0]?.count || 3} Anfragen</span> nicht bearbeiten.
              Möchtest du dir das anschauen?
            </>
          ) : (
            <>
              {issues[0]?.agentName || 'Ein Agent'} ist gestoppt.
              {issues[0]?.reason && <> Grund: {issues[0].reason}</>}
            </>
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          {(status === 'attention' || status === 'problem') && (
            <button
              className="px-5 py-2.5 bg-card text-foreground rounded-lg font-medium hover:bg-muted transition-colors"
            >
              {status === 'attention' ? 'Problem anschauen' : 'Problem beheben'}
            </button>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Mehr Details
            <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-6 mt-6 border-t border-white/10">
              <SimpleStatsGrid stats={stats} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// Simplified Stats Grid
function SimpleStatsGrid({ stats }: { stats: TodayStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SimpleStat
        icon={<MessageCircle className="w-5 h-5" />}
        label="Gespräche geführt"
        value={stats.conversations}
      />
      <SimpleStat
        icon={<Mail className="w-5 h-5" />}
        label="E-Mails versendet"
        value={stats.emailsSent}
      />
      <SimpleStat
        icon={<Target className="w-5 h-5" />}
        label="Leads gefunden"
        value={stats.leadsFound}
      />
      <SimpleStat
        icon={<Clock className="w-5 h-5" />}
        label="Zeit gespart"
        value={formatHours(stats.hoursSaved)}
      />
    </div>
  );
}

interface SimpleStatProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

function SimpleStat({ icon, label, value }: SimpleStatProps) {
  return (
    <div className="text-center p-4 bg-card/5 rounded-xl">
      <div className="flex justify-center text-muted-foreground mb-2">
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// Helper Functions
function calculateOverallStatus(agents: Agent[], issues: Issue[]): SystemStatus {
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const activeAgents = agents.filter(a => a.status === 'active');

  if (criticalIssues.length > 0) return 'problem';
  if (warningIssues.length > 0) return 'attention';
  if (agents.length > 0 && activeAgents.length === 0) return 'attention';

  // Calculate if things are going well
  const avgSuccessRate = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.performanceScore, 0) / agents.length
    : 85;

  if (avgSuccessRate >= 85) return 'excellent';
  return 'good';
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} Minuten`;
  if (hours === 1) return '1 Stunde';
  return `${hours.toFixed(1)} Stunden`;
}
