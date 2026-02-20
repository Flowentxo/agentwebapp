'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Mail,
  Sparkles,
  Code2,
  Briefcase,
  Scale,
  Shield,
  Workflow,
  Bot,
  Building2,
  Zap,
  CheckCircle2,
  Lock,
  ShoppingCart,
  Users,
  FileSearch,
  Server,
  Activity,
  Clock,
  Cpu,
  Undo2,
  Redo2,
  LayoutGrid,
  Move,
  MousePointer,
  Database,
  GitBranch,
} from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { FlowentLogo } from '@/components/ui/FlowentLogo';

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16 pb-8 relative z-10">
      {/* Pill Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 border border-purple-500/30 bg-purple-500/10 text-purple-400 rounded-full px-4 py-1.5 text-sm mb-8"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Flowent AI 2.0 &mdash; Enterprise Release</span>
      </motion.div>

      {/* Headline — colder, more technical gradient */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="text-5xl md:text-7xl font-bold tracking-tighter max-w-4xl leading-[1.05]"
      >
        <span className="text-white">KI-Workflows f&uuml;r</span>
        <br />
        <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
          autonome
        </span>{' '}
        <span className="bg-gradient-to-r from-slate-300 to-zinc-500 bg-clip-text text-transparent">
          Unternehmen.
        </span>
      </motion.h1>

      {/* Subheadline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mt-6 leading-relaxed"
      >
        Orchestriere KI-Agenten, automatisiere Gesch&auml;ftsprozesse und behalte
        volle Kontrolle &mdash; mit Enterprise-Sicherheit und auditierter Governance.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        className="flex flex-col sm:flex-row items-center gap-4 mt-10"
      >
        <Link
          href="/register"
          className="group relative px-8 py-3.5 bg-white text-black font-semibold rounded-full text-sm hover:bg-zinc-100 transition-all shadow-[0_0_30px_rgba(139,92,246,0.25)] flex items-center gap-2"
        >
          Demo buchen
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <a
          href="#platform"
          className="px-8 py-3.5 bg-zinc-900 border border-white/10 text-white font-medium rounded-full text-sm hover:bg-zinc-800 hover:border-white/20 transition-all"
        >
          Technologie entdecken
        </a>
      </motion.div>
    </section>
  );
}

// ============================================================================
// TRUST BAND (Social Proof)
// ============================================================================

const TRUST_LOGOS = [
  'TechVentures',
  'NordCapital',
  'DataFlow GmbH',
  'Meridian AG',
  'QuantumCore',
];

function TrustBand() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true, amount: 0.3 }}
      className="relative z-10 py-16 px-6"
    >
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] font-semibold mb-8">
          Vertrauen von innovativen Teams
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {TRUST_LOGOS.map((name) => (
            <span
              key={name}
              className="text-lg md:text-xl font-bold text-zinc-700 hover:text-zinc-500 transition-colors select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// PLATFORM HUB — Interactive "Live-Engine" Demonstration
// ============================================================================

const PLATFORM_NODES = [
  { icon: Zap, label: 'Webhook', type: 'trigger', typeColor: 'emerald', detail: 'POST /webhook', glowColor: 'rgba(52,211,153,0.35)', status: 'executing' as const, metrics: { latency: '12ms', tokens: '—' } },
  { icon: Bot, label: 'Dexter', type: 'agent', typeColor: 'violet', detail: 'gpt-5-mini', glowColor: 'rgba(139,92,246,0.35)', status: 'executing' as const, metrics: { latency: '42ms', tokens: '1.2k' } },
  { icon: Mail, label: 'E-Mail', type: 'action', typeColor: 'blue', detail: 'SMTP', glowColor: 'rgba(59,130,246,0.35)', status: 'idle' as const, metrics: { latency: '85ms', tokens: '—' } },
  { icon: CheckCircle2, label: 'Response', type: 'output', typeColor: 'pink', detail: 'JSON', glowColor: 'rgba(236,72,153,0.35)', status: 'awaiting' as const, metrics: { latency: '3ms', tokens: '0.4k' } },
];

const TECH_SPECS = [
  { label: 'LATENCY', value: '< 120ms', icon: Clock, bar: { percent: 15, color: 'bg-emerald-500' } },
  { label: 'UPTIME', value: '99.97%', icon: Activity, pulse: true },
  { label: 'AGENTS', value: '15+', icon: Bot },
  { label: 'NODES', value: '∞', icon: Cpu },
  { label: 'MODE', value: 'Streaming', icon: Zap },
] as const;

const INFRA_STATS = [
  { label: 'SERVER', value: 'Online', status: 'online' as const },
  { label: 'REGION', value: 'EU-West-1' },
  { label: 'UPTIME', value: '99.97%' },
];

const SECURITY_STATS = [
  { label: 'ENCRYPTION', value: 'AES-256' },
  { label: 'MFA', value: 'Active', status: 'active' as const },
  { label: 'PRIVACY', value: 'DSGVO' },
];

const TERMINAL_LOGS = [
  { text: '[HOOK] Webhook payload received (2.4kb)', color: 'text-emerald-400' },
  { text: '[AUTH] AES-256 handshake ··· OK', color: 'text-emerald-400' },
  { text: '[INIT] Initializing Dexter Agent ··· OK', color: 'text-violet-400' },
  { text: '[DATA] Processing input tokens: 1,247', color: 'text-violet-400' },
  { text: '[SMTP] E-Mail template rendered (HTML)', color: 'text-blue-400' },
  { text: '[OUT]  Response dispatched \u2192 200 OK', color: 'text-pink-400' },
];

function StatsPanel({ title, items, side }: {
  title: string;
  items: { label: string; value: string; status?: 'online' | 'active' }[];
  side: 'left' | 'right';
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      viewport={{ once: true }}
      className="hidden lg:flex flex-col w-44 flex-shrink-0 p-4 rounded-xl gap-3 self-center"
      style={{
        backgroundColor: 'rgba(24,24,27,0.3)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <p className="text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-wider">{title}</p>
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{item.label}</p>
          <div className="flex items-center gap-1.5">
            {item.status && (
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
            <p className="text-xs font-bold text-white">{item.value}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function TerminalConsole() {
  const [visibleLines, setVisibleLines] = useState<number[]>([0]);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current = (current + 1) % TERMINAL_LOGS.length;
      setVisibleLines((prev) => {
        const next = [...prev, current];
        return next.length > 4 ? next.slice(-4) : next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:block border-t border-white/10 bg-black/80 backdrop-blur-md">
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-white/5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Terminal</span>
      </div>
      <div className="px-4 py-2 h-[72px] overflow-hidden font-mono text-[10px] leading-[18px] flex flex-col justify-end">
        {visibleLines.map((lineIdx, i) => {
          const log = TERMINAL_LOGS[lineIdx];
          return (
            <div
              key={`${lineIdx}-${i}`}
              className="terminal-line-in flex items-center gap-2"
            >
              <span className="text-zinc-600 select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={log.color}>{log.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlatformHub() {
  return (
    <section id="platform" className="relative z-10 px-6 pt-16 pb-24 scroll-mt-20">
      {/* Ambient Engine Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.04) 40%, transparent 70%)',
        }}
      />

      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center mb-8 max-w-5xl mx-auto"
      >
        <span className="inline-block text-[11px] font-mono font-bold tracking-[0.2em] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full mb-5">
          PLATTFORM
        </span>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          Die Flowent Engine.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
            Dein Betriebssystem f&uuml;r KI.
          </span>
        </h2>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Verbinde Agenten, Tools und Datenquellen in einer hochsicheren Umgebung.
          Erstelle komplexe Pipelines mit milit&auml;rischer Pr&auml;zision und menschlicher Kontrolle.
        </p>
      </motion.div>

      {/* Multi-Window Cockpit Layout */}
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-6">
        {/* Left: Infrastructure Panel */}
        <StatsPanel title="INFRASTRUCTURE" items={INFRA_STATS} side="left" />

        {/* Center: Browser Frame */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.2 }}
          className="flex-1 max-w-5xl rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(24, 24, 27, 0.50)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 0 80px rgba(139, 92, 246, 0.12), 0 32px 64px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-zinc-950/80">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-zinc-500 font-medium">
              Visual Workflow Studio &mdash; Flowent AI
            </span>
          </div>
          <div className="w-16" />
        </div>

        {/* Utility Bar */}
        <div className="hidden md:flex items-center justify-between px-4 py-1.5 border-b border-white/5 bg-zinc-950/80">
          <div className="flex items-center gap-4">
            {['File', 'Edit', 'View', 'Logs'].map((item) => (
              <span key={item} className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300 cursor-default transition-colors">
                {item}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-zinc-600">100%</span>
            <div className="flex items-center gap-1.5">
              <Undo2 className="w-3 h-3 text-zinc-600 hover:text-zinc-400 cursor-default transition-colors" />
              <Redo2 className="w-3 h-3 text-zinc-600 hover:text-zinc-400 cursor-default transition-colors" />
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-white/5 cursor-default">
              <LayoutGrid className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-500">Auto-Layout</span>
            </div>
          </div>
        </div>

        <div className="flex h-[320px] md:h-[480px]">
          {/* Left Sidebar — Node Palette */}
          <div className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-white/10 p-3 bg-zinc-950">
            {/* Category: Core */}
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold px-2 mb-1.5">Core</p>
            {[
              { icon: Zap, label: 'Trigger', color: 'emerald' },
              { icon: Shield, label: 'Approval', color: 'amber' },
            ].map((item) => {
              const SideIcon = item.icon;
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              };
              return (
                <div key={item.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${colorMap[item.color]} cursor-default mb-1`}>
                  <SideIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              );
            })}

            {/* Category: AI Agents */}
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold px-2 mt-3 mb-1.5">AI Agents</p>
            {[
              { icon: Bot, label: 'KI-Agent', color: 'violet' },
              { icon: Database, label: 'Dexter', color: 'violet' },
            ].map((item) => {
              const SideIcon = item.icon;
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              };
              return (
                <div key={item.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${colorMap[item.color]} cursor-default mb-1`}>
                  <SideIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              );
            })}

            {/* Category: Actions */}
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold px-2 mt-3 mb-1.5">Actions</p>
            {[
              { icon: Mail, label: 'E-Mail', color: 'blue' },
              { icon: GitBranch, label: 'Branch', color: 'blue' },
            ].map((item) => {
              const SideIcon = item.icon;
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              };
              return (
                <div key={item.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${colorMap[item.color]} cursor-default mb-1`}>
                  <SideIcon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </div>
              );
            })}

            {/* Active Instances */}
            <div className="mt-auto pt-3">
              <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">Active</span>
                <span className="text-[10px] font-bold text-emerald-400">4</span>
              </div>
            </div>
          </div>

          {/* Center — Animated Canvas */}
          <div className="flex-1 relative flex items-center justify-center p-4 md:p-6 pb-36 md:pb-40 overflow-hidden">
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Pipeline Flow */}
            <div className="relative flex items-center gap-2 md:gap-3">
              {PLATFORM_NODES.map((node, i) => (
                <div key={node.label} className={`flex items-center gap-2 md:gap-3 ${i === 3 ? 'hidden sm:flex' : ''}`}>
                  {/* Connector before node (except first) */}
                  {i > 0 && (
                    <AnimatedConnector
                      color={PLATFORM_NODES[i - 1].glowColor}
                      delay={i - 1}
                      className={i === 3 ? 'hidden sm:block' : ''}
                    />
                  )}
                  <PlatformNode
                    icon={node.icon}
                    label={node.label}
                    type={node.type}
                    typeColor={node.typeColor}
                    detail={node.detail}
                    glowColor={node.glowColor}
                    delay={i}
                    status={node.status}
                    metrics={node.metrics}
                  />
                </div>
              ))}
            </div>

            {/* Minimap & Canvas Controls */}
            <div className="absolute bottom-36 right-3 hidden md:flex items-end gap-2">
              {/* Minimap */}
              <div
                className="w-24 h-16 rounded-md overflow-hidden"
                style={{
                  backgroundColor: 'rgba(24,24,27,0.6)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <svg width="96" height="64" viewBox="0 0 96 64" className="w-full h-full">
                  <circle cx="20" cy="32" r="3" fill="rgba(52,211,153,0.5)" />
                  <circle cx="40" cy="32" r="3" fill="rgba(139,92,246,0.5)" />
                  <circle cx="60" cy="32" r="3" fill="rgba(59,130,246,0.5)" />
                  <circle cx="80" cy="32" r="3" fill="rgba(236,72,153,0.5)" />
                  <line x1="23" y1="32" x2="37" y2="32" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="43" y1="32" x2="57" y2="32" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="63" y1="32" x2="77" y2="32" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <rect x="8" y="16" width="80" height="36" rx="2" fill="none" stroke="rgba(139,92,246,0.3)" strokeWidth="1" strokeDasharray="3 2" />
                </svg>
              </div>

              {/* Canvas Controls */}
              <div className="flex flex-col gap-1">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-md cursor-default"
                  style={{
                    backgroundColor: 'rgba(24,24,27,0.6)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Move className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-md cursor-default"
                  style={{
                    backgroundColor: 'rgba(24,24,27,0.6)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <MousePointer className="w-3.5 h-3.5 text-violet-400" />
                </div>
              </div>
            </div>

            {/* Terminal Console — overlaid at bottom of canvas */}
            <div className="absolute bottom-0 left-0 w-full z-20">
              <TerminalConsole />
            </div>
          </div>

          {/* Right — Telemetry Panel */}
          <div className="hidden md:flex flex-col w-56 flex-shrink-0 border-l border-white/10 bg-zinc-950 divide-y divide-white/5">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-wider">Telemetry</p>
            </div>
            {TECH_SPECS.map((spec) => {
              const SpecIcon = spec.icon;
              return (
                <div key={spec.label} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <SpecIcon className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{spec.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white">{spec.value}</p>
                    {'pulse' in spec && spec.pulse && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse" />
                    )}
                  </div>
                  {'bar' in spec && spec.bar && (
                    <div className="mt-1.5 w-full h-1 rounded-full bg-zinc-800">
                      <div
                        className={`h-1 rounded-full ${spec.bar.color}`}
                        style={{ width: `${spec.bar.percent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div className="h-12 flex items-center justify-between px-4 md:px-6 border-t border-white/5 bg-zinc-950/80">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
            4 Nodes &middot; Live
          </span>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium text-violet-400 border border-violet-500/30 hover:bg-violet-500/10 transition-all duration-300"
            style={{ boxShadow: '0 0 12px rgba(139, 92, 246, 0.15)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 12px rgba(139, 92, 246, 0.15)';
            }}
          >
            Jetzt Studio &ouml;ffnen
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        </motion.div>

        {/* Right: Security Panel */}
        <StatsPanel title="SECURITY" items={SECURITY_STATS} side="right" />
      </div>
    </section>
  );
}

function PlatformNode({
  icon: Icon,
  label,
  type,
  typeColor,
  detail,
  glowColor,
  delay,
  status,
  metrics,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: string;
  typeColor: string;
  detail: string;
  glowColor: string;
  delay: number;
  status: 'executing' | 'idle' | 'awaiting';
  metrics: { latency: string; tokens: string };
}) {
  const badgeColors: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    violet: 'bg-violet-500/20 text-violet-400',
    blue: 'bg-blue-500/20 text-blue-400',
    pink: 'bg-pink-500/20 text-pink-400',
  };

  const iconColors: Record<string, string> = {
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
    blue: 'text-blue-400',
    pink: 'text-pink-400',
  };

  const portColor = glowColor.replace(/[\d.]+\)$/, '0.6)');

  return (
    <div
      className="platform-node relative z-10 flex flex-col items-center gap-1.5 px-3 py-3 md:px-4 md:py-4 rounded-xl border border-white/8"
      data-delay={delay}
      style={{
        backgroundColor: 'rgba(24, 24, 27, 0.80)',
        // @ts-expect-error CSS custom property
        '--pulse-color': glowColor,
      }}
    >
      {/* Input Port (left) */}
      <div
        className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
        style={{ borderColor: portColor, backgroundColor: 'rgba(24,24,27,0.9)' }}
      />

      {/* Output Port (right) */}
      <div
        className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
        style={{ borderColor: portColor, backgroundColor: 'rgba(24,24,27,0.9)' }}
      />

      {/* Live Status Indicator */}
      <div className={`absolute top-2 left-2 w-1.5 h-1.5 rounded-full ${
        status === 'executing' ? 'bg-emerald-400 status-pulse' :
        status === 'idle' ? 'bg-blue-400' :
        'bg-amber-400'
      }`} />

      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColors[typeColor] || 'text-white/60'}`} />
        <span className="text-xs font-medium text-white">{label}</span>
      </div>
      <span
        className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColors[typeColor] || 'bg-white/10 text-white/60'}`}
      >
        {type}
      </span>
      <span className="text-[8px] font-mono text-white/25">{detail}</span>

      {/* Mini-Metrics */}
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-[8px] font-mono text-white/20">{metrics.latency}</span>
        {metrics.tokens !== '—' && (
          <>
            <span className="text-[8px] text-white/10">&middot;</span>
            <span className="text-[8px] font-mono text-white/20">{metrics.tokens}</span>
          </>
        )}
      </div>
    </div>
  );
}

function AnimatedConnector({ color, delay, className = '' }: { color: string; delay: number; className?: string }) {
  const connectorColor = color.replace(/[\d.]+\)$/, '0.4)');
  const packetColor = color.replace(/[\d.]+\)$/, '0.9)');

  return (
    <div className={`flex items-center flex-shrink-0 -mx-1 ${className}`}>
      <svg width="48" height="16" viewBox="0 0 48 16" className="overflow-visible">
        {/* Dashed line */}
        <line
          x1="0" y1="8" x2="48" y2="8"
          stroke={connectorColor}
          strokeWidth="1.5"
          strokeDasharray="4 3"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="2s" repeatCount="indefinite" />
        </line>

        {/* Traveling data packet */}
        <circle r="3" fill={packetColor}>
          <animateMotion
            path="M0,8 L48,8"
            dur="4s"
            begin={`${delay}s`}
            repeatCount="indefinite"
            fill="freeze"
          />
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.05;0.15;0.85;1"
            dur="4s"
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
        </circle>

        {/* Glow around packet */}
        <circle r="6" fill={color} opacity="0.3">
          <animateMotion
            path="M0,8 L48,8"
            dur="4s"
            begin={`${delay}s`}
            repeatCount="indefinite"
            fill="freeze"
          />
          <animate
            attributeName="opacity"
            values="0;0;0.3;0.3;0"
            keyTimes="0;0.05;0.15;0.85;1"
            dur="4s"
            begin={`${delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}

// ============================================================================
// BENTO GRID
// ============================================================================

const AGENTS = [
  { name: 'Dexter', color: '#3B82F6', icon: BarChart3 },
  { name: 'Emmie', color: '#A855F7', icon: Mail },
  { name: 'Cassie', color: '#22C55E', icon: Sparkles },
  { name: 'Kai', color: '#F97316', icon: Code2 },
  { name: 'Finn', color: '#10B981', icon: Briefcase },
  { name: 'Lex', color: '#64748B', icon: Scale },
];

const SECURITY_FEATURES = [
  'MFA',
  'Passkeys',
  'RBAC',
  'Audit Log',
  'SSO',
  'Encryption',
];

const COMPLIANCE_BADGES = ['DSGVO', 'SOC2'];

function BentoGrid() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 mt-8 mb-32 relative z-10">
      {/* Section Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
          Enterprise-Infrastruktur.{' '}
          <span className="text-zinc-500">Sofort einsatzbereit.</span>
        </h2>
      </motion.div>

      {/* Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* ── Large Card: Visual Workflow Studio ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, amount: 0.2 }}
          whileHover={{ y: -4 }}
          className="md:col-span-2 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden group hover:border-purple-500/30 transition-[border-color] duration-300 p-8 glass-border"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Workflow className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Visual Workflow Studio
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                Drag-and-Drop Pipeline Editor mit Live-Execution &amp; HITL
              </p>
            </div>
          </div>

          {/* Realistic Mini-Node Pipeline */}
          <div className="mt-6 rounded-2xl bg-zinc-950/60 border border-white/5 p-6 overflow-hidden relative">
            {/* Canvas grid */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <div className="relative flex items-center justify-center gap-4 md:gap-6">
              {/* Mini Node: Trigger */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-900/80 border border-emerald-500/25 flex items-center justify-center backdrop-blur">
                  <Zap className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                </div>
                <span className="text-[8px] text-emerald-400/70 font-semibold uppercase">Trigger</span>
              </div>

              {/* Animated dashed connector */}
              <svg width="48" height="2" className="flex-shrink-0">
                <line x1="0" y1="1" x2="48" y2="1" stroke="rgba(139,92,246,0.3)" strokeWidth="1.5" strokeDasharray="4 3">
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="2s" repeatCount="indefinite" />
                </line>
              </svg>

              {/* Mini Node: Agent */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-900/80 border border-violet-500/30 flex items-center justify-center backdrop-blur shadow-[0_0_12px_rgba(139,92,246,0.15)]">
                  <Bot className="w-4 h-4 md:w-5 md:h-5 text-violet-400" />
                </div>
                <span className="text-[8px] text-violet-400/70 font-semibold uppercase">Agent</span>
              </div>

              <svg width="48" height="2" className="flex-shrink-0">
                <line x1="0" y1="1" x2="48" y2="1" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5" strokeDasharray="4 3">
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="2s" repeatCount="indefinite" />
                </line>
              </svg>

              {/* Mini Node: Action */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-900/80 border border-blue-500/25 flex items-center justify-center backdrop-blur">
                  <Mail className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                </div>
                <span className="text-[8px] text-blue-400/70 font-semibold uppercase">Action</span>
              </div>

              <svg width="48" height="2" className="flex-shrink-0 hidden sm:block">
                <line x1="0" y1="1" x2="48" y2="1" stroke="rgba(236,72,153,0.3)" strokeWidth="1.5" strokeDasharray="4 3">
                  <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="2s" repeatCount="indefinite" />
                </line>
              </svg>

              {/* Mini Node: Output */}
              <div className="hidden sm:flex flex-col items-center gap-1">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-zinc-900/80 border border-pink-500/25 flex items-center justify-center backdrop-blur">
                  <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-pink-400" />
                </div>
                <span className="text-[8px] text-pink-400/70 font-semibold uppercase">Output</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Small Card: Autonome KI-Agenten ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true, amount: 0.2 }}
          whileHover={{ y: -4 }}
          id="agents"
          className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden group hover:border-purple-500/30 transition-[border-color] duration-300 p-8 glass-border"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Autonome KI-Agenten
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                15+ spezialisierte Agenten
              </p>
            </div>
          </div>

          {/* Agent Avatar Grid */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {AGENTS.map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.name}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-zinc-950/40 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${agent.color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: agent.color }} />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {agent.name}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Small Card: Immobilien Sentinel ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true, amount: 0.2 }}
          whileHover={{ y: -4 }}
          className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden group hover:border-purple-500/30 transition-[border-color] duration-300 p-8 glass-border"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Immobilien Sentinel
              </h3>
              <p className="text-zinc-500 text-sm mt-1">
                Echtzeit-Markt&uuml;berwachung
              </p>
            </div>
          </div>

          {/* SVG Sparkline Chart */}
          <div className="mt-4 mb-2 px-1">
            <svg viewBox="0 0 200 48" className="w-full h-12">
              <defs>
                <linearGradient id="sparkline-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(52, 211, 153, 0.3)" />
                  <stop offset="100%" stopColor="rgba(52, 211, 153, 0)" />
                </linearGradient>
              </defs>
              {/* Area fill */}
              <path
                d="M0,40 L28,35 L57,32 L86,28 L114,22 L143,15 L172,10 L200,6 L200,48 L0,48 Z"
                fill="url(#sparkline-grad)"
              />
              {/* Line */}
              <polyline
                points="0,40 28,35 57,32 86,28 114,22 143,15 172,10 200,6"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* End dot */}
              <circle cx="200" cy="6" r="3" fill="#34d399" />
            </svg>
          </div>

          {/* Stats */}
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/40 border border-white/5">
              <span className="text-zinc-500 text-sm">Durchschn. Rendite</span>
              <span className="text-emerald-400 font-bold text-lg">+8.4%</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/40 border border-white/5">
              <span className="text-zinc-500 text-sm">Deals gefunden</span>
              <span className="text-white font-bold text-lg">247</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/40 border border-white/5">
              <span className="text-zinc-500 text-sm">Portale aktiv</span>
              <span className="text-violet-400 font-bold text-lg">12</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

// ============================================================================
// ENTERPRISE SECTION — "Security Wall" + Feature Cards
// ============================================================================

const ENTERPRISE_FEATURES = [
  {
    icon: Users,
    title: 'Role-Based Access (RBAC)',
    description: 'Verwalte Teams und Berechtigungen mit granularer Kontrolle. Jeder Nutzer sieht nur, was er sehen darf.',
  },
  {
    icon: FileSearch,
    title: 'Audit-Logging',
    description: 'Jede Aktion deiner KI-Agenten ist lückenlos nachvollziehbar. Compliance war nie einfacher.',
  },
  {
    icon: Server,
    title: 'Dedicated Inference',
    description: 'Eigene Kapazitäten für maximale Geschwindigkeit. Keine Rate-Limits, keine geteilten Ressourcen.',
  },
];

function EnterpriseSection() {
  return (
    <section id="enterprise" className="relative z-10 py-32 px-6">
      {/* Emerald ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl pointer-events-none opacity-[0.06]"
        style={{ background: 'radial-gradient(ellipse, rgba(52,211,153,0.5), transparent 70%)' }}
      />

      <div className="max-w-6xl mx-auto">
        {/* ── Top Row: Two-Column Security Wall ── */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center mb-20">
          {/* Left: Text + CTA */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block text-[11px] font-mono font-bold tracking-[0.2em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-6">
              ENTERPRISE
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
              KI-Automatisierung{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                mit Enterprise-Garantie.
              </span>
            </h2>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-lg">
              DSGVO-konforme Infrastruktur, lückenlose Audit-Trails und dedizierte
              Ressourcen — damit dein Unternehmen sicher skalieren kann.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all duration-300"
              style={{
                boxShadow: '0 0 20px rgba(52, 211, 153, 0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(52, 211, 153, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(52, 211, 153, 0.15)';
              }}
            >
              Demo buchen
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Right: Security Panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            viewport={{ once: true }}
            className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-8 glass-border"
          >
            {/* Panel Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                style={{ boxShadow: '0 0 20px rgba(52, 211, 153, 0.25)' }}
              >
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Security Panel</h3>
                <p className="text-zinc-500 text-xs">Compliance & Encryption</p>
              </div>
            </div>

            {/* Compliance Badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                DSGVO
              </span>
              <span className="px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                SOC2 <span className="text-[9px] font-normal opacity-60">(Beta)</span>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                AES-256
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.06] mb-5" />

            {/* Security Feature Pills */}
            <div className="flex flex-wrap gap-2">
              {SECURITY_FEATURES.map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-white/[0.06] text-zinc-400 text-xs font-medium hover:border-emerald-500/20 hover:text-zinc-300 transition-colors"
                >
                  {feature}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Bottom Row: Three Feature Cards ── */}
        <div className="grid md:grid-cols-3 gap-6">
          {ENTERPRISE_FEATURES.map((feat, i) => {
            const FeatIcon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true, amount: 0.2 }}
                whileHover={{ y: -4 }}
                className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 group hover:border-emerald-500/30 transition-[border-color] duration-300 glass-border"
              >
                <div
                  className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5"
                  style={{ boxShadow: '0 0 16px rgba(52, 211, 153, 0.2)' }}
                >
                  <FeatIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feat.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feat.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// DEEP DIVE — "Wie es funktioniert"
// ============================================================================

const DEEP_DIVE_FEATURES = [
  {
    icon: Workflow,
    title: 'Drag & Drop Builder',
    description: 'Verbinde Trigger, KI-Agenten und Aktionen ohne eine Zeile Code.',
    iconBg: 'bg-blue-500/10',
    iconBorder: 'border-blue-500/20',
    iconColor: 'text-blue-400',
    iconRing: 'ring-1 ring-blue-500/50',
  },
  {
    icon: Bot,
    title: 'Autonome Agenten',
    description: 'Unsere KI trifft Entscheidungen basierend auf deinen Leitplanken.',
    iconBg: 'bg-emerald-500/10',
    iconBorder: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
    iconRing: 'ring-1 ring-emerald-500/50',
  },
  {
    icon: Shield,
    title: 'Human in the Loop',
    description: 'Behalte die Kontrolle. Lass dir kritische Schritte vor der Ausführung freigeben.',
    iconBg: 'bg-purple-500/10',
    iconBorder: 'border-purple-500/20',
    iconColor: 'text-purple-400',
    iconRing: 'ring-1 ring-purple-500/50',
  },
];

function DeepDive() {
  return (
    <section id="how-it-works" className="relative py-32 px-6">
      {/* Subtle top accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Komplexe Prozesse. Simpel orchestriert.
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Drei Prinzipien, die dein Team von repetitiver Arbeit befreien.
          </p>
        </motion.div>

        {/* Feature Rows */}
        <div className="space-y-8">
          {DEEP_DIVE_FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 rounded-2xl p-6 md:p-8 flex items-start gap-6 transition-all duration-300 glass-border"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${feature.iconBg} border ${feature.iconBorder} ${feature.iconRing} flex items-center justify-center`}>
                  <Icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1.5">{feature.title}</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// USE CASES — Branchen-Lösungen
// ============================================================================

const USE_CASES = [
  {
    icon: Building2,
    title: 'Immobilien',
    description: 'Automatisiere Akquise, Exposé-Erstellung und Marktanalyse.',
    iconBg: 'bg-emerald-500/20',
    iconBorder: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    cardGradient: 'bg-gradient-to-br from-emerald-900/10 to-transparent',
    hoverGlow: 'hover:-translate-y-2 hover:border-emerald-500/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)]',
  },
  {
    icon: ShoppingCart,
    title: 'E-Commerce',
    description: 'KI-gestützter Kundensupport und automatische Retouren-Abwicklung.',
    iconBg: 'bg-blue-500/20',
    iconBorder: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    cardGradient: 'bg-gradient-to-br from-blue-900/10 to-transparent',
    hoverGlow: 'hover:-translate-y-2 hover:border-blue-500/50 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]',
  },
  {
    icon: Briefcase,
    title: 'Finance & HR',
    description: 'Belegprüfung, Onboarding-Workflows und Vertragsanalysen in Sekunden.',
    iconBg: 'bg-purple-500/20',
    iconBorder: 'border-purple-500/30',
    iconColor: 'text-purple-400',
    cardGradient: 'bg-gradient-to-br from-purple-900/10 to-transparent',
    hoverGlow: 'hover:-translate-y-2 hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)]',
  },
];

function UseCases() {
  return (
    <section className="relative pt-40 pb-32 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Gebaut für jedes Geschäftsmodell.
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Branchenspezifische Workflows, die vom ersten Tag an Ergebnisse liefern.
          </p>
        </motion.div>

        {/* 3-Column Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {USE_CASES.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <motion.div
                key={uc.title}
                className={`group p-8 rounded-2xl bg-zinc-900/40 ${uc.cardGradient} backdrop-blur-md border border-white/10 transition-all duration-500 ${uc.hoverGlow} glass-border`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className={`w-14 h-14 rounded-2xl ${uc.iconBg} border ${uc.iconBorder} flex items-center justify-center mb-6`}>
                  <Icon className={`w-7 h-7 ${uc.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{uc.title}</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">{uc.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA — Conversion Banner
// ============================================================================

function FinalCTA() {
  return (
    <section className="relative border-t border-purple-500/10 py-40 px-6">
      {/* Radial purple glow backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(147,51,234,0.25),transparent_70%)]" />

      <motion.div
        className="relative z-10 text-center max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
          Bereit, dein Unternehmen zu automatisieren?
        </h2>
        <p className="text-zinc-400 text-lg mb-10">
          Schließe dich hunderten innovativen Teams an und starte noch heute mit Flowent AI.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
          >
            Konto erstellen
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 h-12 px-8 rounded-xl border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
          >
            Sales kontaktieren
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

const FOOTER_LINKS = {
  Produkt: [
    { label: 'Plattform', href: '#platform' },
    { label: 'Features', href: '#features' },
    { label: 'Agenten', href: '/agenten' },
    { label: 'Enterprise', href: '#enterprise' },
  ],
  Ressourcen: [
    { label: 'Dokumentation', href: '#' },
    { label: 'API', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  Rechtliches: [
    { label: 'Datenschutz', href: '/datenschutz' },
    { label: 'Impressum', href: '/impressum' },
    { label: 'AGB', href: '/agb' },
  ],
};

function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="border-t border-white/5 mt-0 py-12 px-6 relative z-10"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Logo Column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <FlowentLogo className="w-3.5 h-3.5 text-violet-400/60" />
              </div>
              <span className="text-lg font-bold text-white/30">Flowent</span>
            </div>
            <p className="text-zinc-600 text-sm leading-relaxed">
              KI-Infrastruktur f&uuml;r das moderne Unternehmen.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-zinc-400 mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link
                        href={link.href}
                        className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            &copy; 2026 Flowent AI. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>
    </motion.footer>
  );
}

// ============================================================================
// LANDING PAGE (Main Export)
// ============================================================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden noise-overlay">
      {/* Technical Dot Grid Background */}
      <div className="landing-grid" aria-hidden="true" />

      {/* Animated Mesh Gradient Background */}
      <div className="bg-mesh" aria-hidden="true" />

      {/* Navbar */}
      <PublicNavbar />

      {/* Hero */}
      <HeroSection />

      {/* Trust Band */}
      <TrustBand />

      {/* Platform Hub — Interactive Live-Engine */}
      <PlatformHub />

      {/* Bento Feature Grid */}
      <BentoGrid />

      {/* Enterprise Solutions */}
      <EnterpriseSection />

      {/* Deep Dive — How it Works */}
      <DeepDive />

      {/* Use Cases — Industry Solutions */}
      <UseCases />

      {/* Final CTA — Conversion Banner */}
      <FinalCTA />

      {/* Footer */}
      <Footer />
    </div>
  );
}
