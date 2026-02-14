'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';
import { agentPersonas } from '@/lib/agents/personas';
import {
  Search,
  Zap,
  Activity,
  Database,
  Cpu,
  Terminal,
  ChevronRight,
  Hexagon,
} from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui/premium';

// ─── Constants ────────────────────────────────────────────────────────────────
const totalCapabilities = agentPersonas.reduce((sum, a) => sum + a.specialties.length, 0);

const PARTICLES = [
  { top: '8%', left: '12%', size: 'w-1.5 h-1.5', color: 'bg-emerald-500/20', anim: 'animate-float-slow', delay: '0s' },
  { top: '15%', left: '78%', size: 'w-1 h-1', color: 'bg-cyan-500/20', anim: 'animate-float-medium', delay: '-3s' },
  { top: '35%', left: '5%', size: 'w-2 h-2', color: 'bg-indigo-500/15', anim: 'animate-float-fast', delay: '-1s' },
  { top: '45%', left: '92%', size: 'w-1.5 h-1.5', color: 'bg-violet-500/15', anim: 'animate-float-slow', delay: '-6s' },
  { top: '62%', left: '25%', size: 'w-1 h-1', color: 'bg-emerald-500/15', anim: 'animate-float-medium', delay: '-2s' },
  { top: '72%', left: '68%', size: 'w-2 h-2', color: 'bg-cyan-500/15', anim: 'animate-float-fast', delay: '-4s' },
  { top: '88%', left: '45%', size: 'w-1 h-1', color: 'bg-indigo-500/10', anim: 'animate-float-slow', delay: '-8s' },
  { top: '22%', left: '55%', size: 'w-1.5 h-1.5', color: 'bg-violet-500/10', anim: 'animate-float-medium', delay: '-5s' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsBrowsePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFocused, setIsFocused] = useState(false);

  const categories = [
    { value: 'all', label: 'ALL UNITS' },
    { value: 'marketing', label: 'MARKETING' },
    { value: 'data', label: 'DATA' },
    { value: 'support', label: 'SUPPORT' },
    { value: 'operations', label: 'OPS' },
    { value: 'creative', label: 'CREATIVE' },
    { value: 'technical', label: 'TECH' },
  ];

  const filteredAgents = useMemo(() => {
    return agentPersonas.filter(agent => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        agent.name.toLowerCase().includes(q) ||
        agent.role.toLowerCase().includes(q) ||
        agent.specialties.some(s => s.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === 'all' || agent.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div
      className="min-h-screen px-6 py-8 lg:px-10 bg-neutral-950 relative overflow-hidden"
      style={{ fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Ambient floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${p.size} ${p.color} ${p.anim} blur-[1px]`}
            style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto space-y-6">
        {/* ── Header ──────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Hexagon className="w-5 h-5 text-emerald-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-400/70">
                FLOWENT SYSTEMS
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Agent Command Center
            </h1>
            <p className="text-white/30 font-mono text-xs tracking-wide">
              Neural agent fleet management &middot; v3.0.0
            </p>
          </div>
        </motion.header>

        {/* ── HUD Stats Bar ───────────────────────────────────── */}
        <HudStatsBar agentCount={agentPersonas.length} capabilityCount={totalCapabilities} />

        {/* ── Command Search + Filters ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          {/* Terminal search */}
          <div
            className={`
              relative flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-sm
              bg-black/40 border transition-all duration-200 overflow-hidden
              ${isFocused
                ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                : 'border-emerald-500/15'}
            `}
          >
            {/* Focus scan sweep */}
            <AnimatePresence>
              {isFocused && (
                <motion.div
                  className="absolute inset-y-0 w-[30%] pointer-events-none z-0"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.12), transparent)' }}
                  initial={{ left: '-30%' }}
                  animate={{ left: '130%' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>

            <Terminal className="w-4 h-4 text-emerald-500/60 flex-shrink-0 relative z-10" />
            <span className="text-emerald-400 text-sm flex-shrink-0 select-none relative z-10">&#x276F;</span>
            <input
              type="text"
              placeholder="search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="flex-1 bg-transparent text-white/80 placeholder:text-white/20 focus:outline-none font-mono text-sm relative z-10"
            />
            {!searchQuery && (
              <span className="text-emerald-400 animate-pulse text-sm font-mono select-none relative z-10">|</span>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`
                  px-3.5 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-[0.15em]
                  transition-all duration-200 border
                  ${selectedCategory === cat.value
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                    : 'text-white/30 bg-transparent border-transparent hover:text-white/50 hover:bg-white/[0.03]'}
                `}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Results count ────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/[0.04]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/20">
            {filteredAgents.length} UNIT{filteredAgents.length !== 1 ? 'S' : ''} DETECTED
          </span>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>

        {/* ── Agent Grid ──────────────────────────────────────── */}
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredAgents.map((agent, index) => (
              <HolographicAgentCard
                key={agent.id}
                agent={agent}
                index={index}
                onClick={() => router.push(`/agents/${agent.id}/chat`)}
              />
            ))}
          </div>
        </AnimatePresence>

        {/* ── Empty State ─────────────────────────────────────── */}
        {filteredAgents.length === 0 && (
          <EmptyState
            icon={<Search className="w-10 h-10" />}
            title="No agents found"
            description={`No units matching "${searchQuery || selectedCategory}". Adjust query parameters.`}
            action={
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="px-5 py-2.5 rounded-lg font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
              >
                Reset Filters
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}

// ─── HUD Stats Bar ────────────────────────────────────────────────────────────

function HudStatsBar({ agentCount, capabilityCount }: { agentCount: number; capabilityCount: number }) {
  const metrics = [
    { icon: <Cpu className="w-3.5 h-3.5" />, label: 'TOTAL AGENTS', value: String(agentCount), color: 'text-white' },
    { icon: <Zap className="w-3.5 h-3.5" />, label: 'CAPABILITIES', value: `${capabilityCount} Tools`, color: 'text-white' },
    { icon: <Activity className="w-3.5 h-3.5" />, label: 'SYSTEM STATUS', value: 'OPERATIONAL', color: 'text-emerald-400', pulse: true },
    { icon: <Database className="w-3.5 h-3.5" />, label: 'MEMORY', value: 'PGVECTOR ACTIVE', color: 'text-cyan-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent animate-scan-line" style={{ width: '40%' }} />

      <div className="grid grid-cols-2 md:grid-cols-4">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`px-5 py-4 flex flex-col gap-1.5 ${i < metrics.length - 1 ? 'md:border-r border-white/[0.06]' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-white/20">{m.icon}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">{m.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {m.pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              )}
              <span className={`font-mono text-sm font-bold tracking-wide ${m.color}`}>{m.value}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Holographic Agent Card with 3D Tilt ──────────────────────────────────────

interface HolographicAgentCardProps {
  agent: (typeof agentPersonas)[0];
  index: number;
  onClick: () => void;
}

function HolographicAgentCard({ agent, index, onClick }: HolographicAgentCardProps) {
  const Icon = agent.icon;
  const isIconComponent = typeof Icon !== 'string';
  const isReady = agent.status === 'active';
  const maturityLevel = isReady ? 10 : agent.status === 'beta' ? 7 : 3;

  // ── 3D tilt tracking ──
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useTransform(my, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(mx, [-0.5, 0.5], [-7, 7]);
  const springX = useSpring(rotateX, { stiffness: 250, damping: 30 });
  const springY = useSpring(rotateY, { stiffness: 250, damping: 30 });

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mx, my]);

  const handleMouseLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
    setIsHovered(false);
  }, [mx, my]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="group cursor-pointer"
      style={{ perspective: 800 }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative p-5 rounded-2xl border backdrop-blur-xl overflow-hidden transition-[border-color,box-shadow] duration-300"
        style={{
          background: 'rgba(255,255,255,0.025)',
          borderColor: isHovered ? `${agent.color}50` : 'rgba(255,255,255,0.06)',
          boxShadow: isHovered
            ? `0 0 30px ${agent.color}15, inset 0 0 30px ${agent.color}05`
            : 'none',
          rotateX: springX,
          rotateY: springY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Top edge glow line */}
        <div
          className="absolute top-0 left-4 right-4 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${agent.color}80, transparent)` }}
        />

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar with breathing glow */}
            <motion.div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: `${agent.color}15`,
                border: `1px solid ${agent.color}30`,
              }}
              animate={{
                boxShadow: [
                  `0 0 8px ${agent.color}15, 0 0 20px ${agent.color}08`,
                  `0 0 18px ${agent.color}30, 0 0 36px ${agent.color}12`,
                  `0 0 8px ${agent.color}15, 0 0 20px ${agent.color}08`,
                ],
                scale: [1, 1.04, 1],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {isIconComponent ? (
                <Icon className="w-5 h-5" style={{ color: agent.color }} />
              ) : (
                <span className="text-lg">{Icon}</span>
              )}
            </motion.div>

            {/* Name + Role */}
            <div className="min-w-0">
              <h3 className="text-sm font-bold font-mono text-white tracking-wide truncate">
                {agent.name.toUpperCase()}
              </h3>
              <p className="text-[11px] text-white/35 truncate">{agent.role}</p>
            </div>
          </div>

          {/* Status */}
          {agent.status && agent.status !== 'active' ? (
            <Badge
              text={agent.status === 'beta' ? 'BETA' : 'SOON'}
              color={agent.status === 'beta' ? 'yellow' : 'white'}
            />
          ) : (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400/80">
                Ready
              </span>
            </div>
          )}
        </div>

        {/* ── Capabilities (inline dot-separated) ── */}
        <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/25 mb-3 leading-relaxed truncate">
          {agent.specialties.join(' · ')}
        </p>

        {/* ── Maturity Line (thin glowing wire) ── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/25">
              Maturity
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              LVL {maturityLevel}/10
            </span>
          </div>
          <div className="h-[1px] bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: agent.color,
                boxShadow: `0 0 6px ${agent.color}50, 0 0 12px ${agent.color}25`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${maturityLevel * 10}%` }}
              transition={{ duration: 1, delay: index * 0.04 + 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        {/* ── Uplink Button with light trail ── */}
        <div className="relative group/btn">
          {/* Spinning conic gradient border — revealed on hover */}
          <div
            className="absolute -inset-[1px] rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 overflow-hidden"
          >
            <div
              className="absolute inset-[-4px]"
              style={{
                background: `conic-gradient(from 0deg, transparent, transparent 70%, ${agent.color}80, transparent)`,
                animation: 'spin 2.5s linear infinite',
              }}
            />
          </div>

          <button
            className="relative w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-[10px] uppercase tracking-[0.15em] transition-all duration-200"
            style={{
              background: 'rgb(10,10,10)',
              borderColor: 'transparent',
              color: isHovered ? agent.color : 'rgba(255,255,255,0.4)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Hexagon className="w-3 h-3" />
            Initialize Uplink
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
