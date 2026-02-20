'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Check, Star, Zap } from 'lucide-react';
import { agentPersonas } from '@/lib/agents/personas';
import { REVOLUTIONARY_PERSONAS } from '@/lib/agents/personas-revolutionary';
import type { AgentPersonality } from '@/lib/agents/personas-revolutionary';
import type { LucideIcon } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/PublicNavbar';

// ─── Categories for filter pills ───────────────────────────────────────────
const CATEGORIES = [
  { key: 'all', label: 'Alle' },
  { key: 'data', label: 'Datenanalyse' },
  { key: 'operations', label: 'Operations' },
  { key: 'support', label: 'Support' },
  { key: 'technical', label: 'Entwicklung' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'creative', label: 'Kreativ' },
  { key: 'motion', label: 'Motion' },
  { key: 'AI & Automation', label: 'Automation' },
  { key: 'Data & Analytics', label: 'Analytics' },
];

// ─── Helper: convert hex to rgba ───────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Competency labels (mono code-name per agent) ────────────────────────────
const COMPETENCY_LABELS: Record<string, string> = {
  dexter:                'DATA_STRATEGIST',
  cassie:                'SUPPORT_SPECIALIST',
  emmie:                 'EMAIL_STRATEGIST',
  aura:                  'BRAND_ARCHITECT',
  kai:                   'CODE_ENGINEER',
  lex:                   'LEGAL_GUARDIAN',
  finn:                  'FINANCE_STRATEGIST',
  nova:                  'RESEARCH_ANALYST',
  vince:                 'VIDEO_PRODUCER',
  milo:                  'MOTION_DESIGNER',
  ari:                   'AUTOMATION_ARCHITECT',
  vera:                  'SECURITY_ANALYST',
  echo:                  'AUDIO_SPECIALIST',
  omni:                  'MULTI_AGENT_ORCHESTRATOR',
  buddy:                 'BUDGET_INTELLIGENCE',
  'tenant-communicator': 'TENANT_COMMUNICATIONS',
  'property-sentinel':   'MARKET_SURVEILLANCE',
};

// ─── Decorative skill bar widths (visual hierarchy) ──────────────────────────
const SKILL_BAR_WIDTHS = [92, 85, 78];

// ─── Status badge derivation ─────────────────────────────────────────────────
function getStatusBadge(status?: string, rev?: AgentPersonality | null): { label: string; classes: string } {
  if (status === 'beta') {
    return { label: 'Beta', classes: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' };
  }
  if (status === 'coming-soon' || status === 'draft') {
    return { label: 'Coming Soon', classes: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20' };
  }
  if (rev?.category === 'radical') {
    return { label: 'Elite Agent', classes: 'bg-red-500/10 text-red-400 border border-red-500/20' };
  }
  return { label: 'Verified', classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
}

export default function AgentenPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredAgents = useMemo(() => {
    if (activeCategory === 'all') return agentPersonas;
    return agentPersonas.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white noise-overlay page-dot-grid">
      <div className="aura-glow" aria-hidden="true" />
      {/* ── Navigation Bar ─────────────────────────────────────────────── */}
      <PublicNavbar />

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative z-10 pt-32 pb-16 px-6 text-center bg-[radial-gradient(ellipse_at_top,rgba(147,51,234,0.15),transparent_70%)]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-6"
        >
          <span className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium px-4 py-1.5 rounded-full">
            <Bot className="w-3.5 h-3.5" />
            Unsere KI-Flotte
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold text-white tracking-tight"
        >
          Triff dein neues Team.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mt-6 leading-relaxed"
        >
          {agentPersonas.length} spezialisierte KI-Agenten. Jeder ein Experte.
          Alle bereit, f&uuml;r dich zu arbeiten.
        </motion.p>
      </section>

      {/* ── Filter / Category Pills ────────────────────────────────────── */}
      <section className="relative z-10 flex flex-wrap gap-2 justify-center py-8 px-6 max-w-4xl mx-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
              activeCategory === cat.key
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:border-white/10'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </section>

      {/* ── Agent Grid ─────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredAgents.map((agent, index) => {
            const rev = REVOLUTIONARY_PERSONAS[agent.id];
            const Icon = typeof agent.icon !== 'string' ? (agent.icon as LucideIcon) : null;
            const agentColor = rev?.colors?.primary || agent.color;
            const badge = getStatusBadge(agent.status, rev || null);
            const competencyLabel = COMPETENCY_LABELS[agent.id] || agent.role.toUpperCase().replace(/\s+/g, '_');

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="relative group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 overflow-hidden border border-white/[0.06] hover:border-white/[0.12]"
                style={{
                  background: 'rgba(24, 24, 27, 0.4)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 40px ${hexToRgba(agentColor, 0.15)}, 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px 0 rgba(255,255,255,0.06)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 0 1px 1px 0 rgba(255,255,255,0.04)';
                }}
              >
                {/* ── Background Glow Aura ── */}
                <div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-500 blur-3xl pointer-events-none"
                  style={{ backgroundColor: agentColor }}
                />

                {/* ── Row 1: Competency Label + Status Badge ── */}
                <div className="flex items-center justify-between mb-4 relative">
                  <span
                    className="text-[10px] font-mono font-semibold tracking-[0.15em] opacity-50 group-hover:opacity-70 transition-opacity"
                    style={{ color: agentColor }}
                  >
                    {competencyLabel}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.classes}`}>
                    {badge.label}
                  </span>
                </div>

                {/* ── Row 2: Power-Icon + Name + Title ── */}
                <div className="flex items-start gap-4 mb-5 relative">
                  {/* Icon Container with Certification Badge */}
                  <div className="relative flex-shrink-0">
                    {/* Glassmorphism 2.0 Icon Container */}
                    <div
                      className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center border border-white/10 transition-all duration-300 group-hover:scale-105"
                      style={{
                        background: 'linear-gradient(to bottom right, rgba(63,63,70,0.8), rgba(24,24,27,0.9))',
                        boxShadow: `inset 0 0 20px ${hexToRgba(agentColor, 0.15)}, 0 0 24px ${hexToRgba(agentColor, 0.15)}, 0 8px 32px rgba(0,0,0,0.3)`,
                      }}
                    >
                      {Icon ? (
                        <Icon
                          className="w-7 h-7 transition-all duration-300 group-hover:scale-110"
                          style={{
                            color: agentColor,
                            filter: `drop-shadow(0 0 8px ${hexToRgba(agentColor, 0.6)})`,
                          }}
                        />
                      ) : (
                        <span className="text-xl" style={{ filter: `drop-shadow(0 0 8px ${hexToRgba(agentColor, 0.5)})` }}>{agent.emoji || '\u{1F916}'}</span>
                      )}
                    </div>

                    {/* Certification Badge — fused into icon corner */}
                    {(() => {
                      const badgeMap: Record<string, { bg: string; glow: string; icon: LucideIcon }> = {
                        Verified:      { bg: '#059669', glow: 'rgba(5,150,105,0.5)', icon: Check },
                        'Elite Agent': { bg: '#DC2626', glow: 'rgba(220,38,38,0.5)', icon: Star },
                        Beta:          { bg: '#CA8A04', glow: 'rgba(202,138,4,0.5)', icon: Zap },
                        'Coming Soon': { bg: '#52525B', glow: 'rgba(82,82,91,0.3)', icon: Bot },
                      };
                      const bm = badgeMap[badge.label] || badgeMap['Verified'];
                      const BadgeIcon = bm.icon;
                      return (
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-900"
                          style={{
                            backgroundColor: bm.bg,
                            boxShadow: `0 0 8px ${bm.glow}`,
                          }}
                        >
                          <BadgeIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                      );
                    })()}
                  </div>

                  <div className="min-w-0 pt-1">
                    <h3 className="text-lg font-bold text-white leading-tight">{agent.name}</h3>
                    <p
                      className="text-sm font-medium mt-0.5"
                      style={{ color: hexToRgba(agentColor, 0.85) }}
                    >
                      {rev?.title || agent.role}
                    </p>
                  </div>
                </div>

                {/* ── Row 3: Motto Blockquote ── */}
                {(rev?.motto || agent.bio) && (
                  <blockquote className="mb-5 pl-3 border-l-2 border-white/[0.06] relative">
                    <p className="text-zinc-400 text-[13px] italic leading-relaxed">
                      &ldquo;{rev?.motto || agent.bio}&rdquo;
                    </p>
                  </blockquote>
                )}

                {/* ── Row 4: Skill Bars (superpowers) ── */}
                {rev?.superpowers && rev.superpowers.length > 0 && (
                  <div className="space-y-2.5 mb-5 relative">
                    {rev.superpowers.map((sp, i) => (
                      <div key={i}>
                        <span className="text-zinc-400 text-xs leading-tight block mb-1">{sp}</span>
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${SKILL_BAR_WIDTHS[i] || 75}%`,
                              background: `linear-gradient(90deg, ${hexToRgba(agentColor, 0.6)}, ${hexToRgba(agentColor, 0.2)})`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Row 5: Specialty Pills ── */}
                <div className="flex flex-wrap gap-1.5 mb-5 relative">
                  {agent.specialties.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="text-[11px] px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: hexToRgba(agentColor, 0.08),
                        color: hexToRgba(agentColor, 0.7),
                        border: `1px solid ${hexToRgba(agentColor, 0.1)}`,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* ── Row 6: CTA Button ── */}
                <Link
                  href={`/agents/${agent.id}/chat`}
                  className="relative flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-zinc-300 border border-white/[0.08] transition-all duration-300 group-hover:text-white"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hexToRgba(agentColor, 0.15);
                    e.currentTarget.style.borderColor = hexToRgba(agentColor, 0.3);
                    e.currentTarget.style.boxShadow = `0 0 20px ${hexToRgba(agentColor, 0.2)}`;
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.color = '';
                  }}
                >
                  Agent anheuern
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredAgents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm">
              Keine Agenten in dieser Kategorie gefunden.
            </p>
            <button
              onClick={() => setActiveCategory('all')}
              className="mt-3 text-purple-400 hover:text-purple-300 text-sm transition-colors"
            >
              Alle Agenten anzeigen
            </button>
          </div>
        )}
      </section>

      {/* ── CTA Footer ─────────────────────────────────────────────────── */}
      <section className="relative z-10 py-32 px-6 border-t border-white/5 text-center bg-[radial-gradient(ellipse_at_bottom,rgba(147,51,234,0.1),transparent_70%)]">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-white"
        >
          Bereit, deinen ersten Agenten einzustellen?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-zinc-400 mt-4 mb-8"
        >
          Starte kostenlos. Keine Kreditkarte erforderlich.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-medium shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_25px_rgba(147,51,234,0.4)] transition-all duration-300"
          >
            Kostenlos starten
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
