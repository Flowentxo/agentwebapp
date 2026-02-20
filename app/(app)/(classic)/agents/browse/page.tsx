'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { agentPersonas } from '@/lib/agents/personas';
import {
  Search,
  ChevronRight,
} from 'lucide-react';
import { Badge, EmptyState } from '@/components/ui/premium';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsBrowsePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFocused, setIsFocused] = useState(false);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'data', label: 'Data' },
    { value: 'support', label: 'Support' },
    { value: 'operations', label: 'Ops' },
    { value: 'creative', label: 'Creative' },
    { value: 'technical', label: 'Tech' },
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
      className="min-h-0 flex-1 px-6 py-8 lg:px-10 relative overflow-y-auto"
      style={{ backgroundColor: '#030712' }}
    >
      {/* Aurora glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            top: '-20%',
            left: '20%',
            width: '600px',
            height: '600px',
            background: 'rgba(59, 130, 246, 0.08)',
            filter: 'blur(120px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '10%',
            right: '10%',
            width: '400px',
            height: '400px',
            background: 'rgba(6, 182, 212, 0.05)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto space-y-6 pb-10">
        {/* ── Header ──────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6"
        >
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Dein Team
            </h1>
            <p className="text-slate-500 text-sm">
              Wähle einen Experten für deine Aufgabe
            </p>
          </div>
        </motion.header>

        {/* ── Search + Filters ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          {/* Search input */}
          <div
            className={`
              relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm
              bg-white/[0.03] border transition-all duration-300
              ${isFocused
                ? 'border-white/[0.12] shadow-[0_0_20px_rgba(255,255,255,0.04)]'
                : 'border-white/[0.06]'}
            `}
          >
            <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
            <input
              type="text"
              placeholder="Suche nach Name oder Aufgabe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none text-sm"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`
                  px-3.5 py-1.5 rounded-lg text-xs font-medium
                  transition-all duration-200 border
                  ${selectedCategory === cat.value
                    ? 'text-white bg-white/[0.08] border-white/[0.12]'
                    : 'text-white/40 bg-transparent border-transparent hover:text-white/60 hover:bg-white/[0.04]'}
                `}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Results count ────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-xs text-white/30">
            {filteredAgents.length} Experte{filteredAgents.length !== 1 ? 'n' : ''} verfügbar
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* ── Agent Grid ──────────────────────────────────────── */}
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredAgents.map((agent, index) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                index={index}
                onClick={() => router.push(
                  agent.id === 'property-sentinel'
                    ? '/agents/property-sentinel/dashboard'
                    : `/agents/${agent.id}/chat`
                )}
              />
            ))}
          </div>
        </AnimatePresence>

        {/* ── Empty State ─────────────────────────────────────── */}
        {filteredAgents.length === 0 && (
          <EmptyState
            icon={<Search className="w-10 h-10" />}
            title="Keine Experten gefunden"
            description={`Keine Experten für "${searchQuery || selectedCategory}". Versuche eine andere Suche.`}
            action={
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white/70 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] transition-all"
              >
                Filter zurücksetzen
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}

// ─── Agent Card ──────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: (typeof agentPersonas)[0];
  index: number;
  onClick: () => void;
}

function AgentCard({ agent, index, onClick }: AgentCardProps) {
  const Icon = agent.icon;
  const isIconComponent = typeof Icon !== 'string';

  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          relative p-5 rounded-2xl border overflow-hidden
          transition-all duration-300
          bg-white/[0.02]
          ${isHovered
            ? 'border-white/[0.12] shadow-[0_0_30px_rgba(255,255,255,0.04)]'
            : 'border-white/[0.06]'}
        `}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-shadow duration-300"
              style={{
                background: `${agent.color}15`,
                border: `1px solid ${agent.color}30`,
                boxShadow: isHovered ? `0 0 20px ${agent.color}30` : `0 0 12px ${agent.color}15`,
              }}
            >
              {isIconComponent ? (
                <Icon className="w-5 h-5" style={{ color: agent.color }} />
              ) : (
                <span className="text-lg">{Icon}</span>
              )}
            </div>

            {/* Name + Role */}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">
                {agent.name}
              </h3>
              <p className="text-[11px] text-white/40 truncate">{agent.role}</p>
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
              <span className="text-[10px] text-emerald-400/80">
                Bereit
              </span>
            </div>
          )}
        </div>

        {/* ── Capabilities ── */}
        <p className="text-xs text-white/35 mb-4 leading-relaxed truncate">
          {agent.specialties.join(' · ')}
        </p>

        {/* ── CTA Button ── */}
        <button
          className={`
            w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
            text-sm font-medium
            transition-all duration-300 border
            ${isHovered
              ? 'bg-white/[0.10] border-white/[0.15] text-white'
              : 'bg-white/[0.04] border-white/[0.08] text-white/60'}
          `}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Chat starten
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
